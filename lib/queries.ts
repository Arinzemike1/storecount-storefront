import "server-only";
import { cache } from "react";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import type {
  FulfilmentMethod,
  Order,
  OrderItem,
  StoreProfile,
  StorefrontProduct,
} from "./storefront-types";

/**
 * THE ONLY FILE THAT MAY TOUCH THE DATABASE.
 *
 * This deployment is public and holds the Supabase service-role key, which
 * bypasses RLS entirely — it can read every merchant's sales history and PIN
 * hashes. Every query below is a fixed shape parameterised by a slug or an
 * opaque token; no query is ever assembled from user input, and nothing here
 * reads the `users` or `user_data` tables.
 *
 * An ESLint rule blocks `@/lib/db` imports everywhere else. Do not add an
 * exception. The Phase 2 hardening step replaces these reads with the anon key
 * plus narrow RLS policies, shrinking the blast radius to public catalogs.
 */

type Row = Record<string, unknown>;

function toStoreProfile(row: Row): StoreProfile {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    currency: String(row.currency ?? "NGN"),
    isOpen: Boolean(row.is_open),
    isPublished: Boolean(row.is_published),
    acceptsDelivery: Boolean(row.accepts_delivery),
    acceptsPickup: Boolean(row.accepts_pickup),
    deliveryFee: Number(row.delivery_fee ?? 0),
    deliveryNote: (row.delivery_note as string | null) ?? null,
    minOrderTotal: Number(row.min_order_total ?? 0),
  };
}

function toProduct(row: Row): StorefrontProduct {
  return {
    productId: String(row.product_id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    price: Number(row.price ?? 0),
    availableQuantity: Number(row.available_quantity ?? 0),
    imageUrl: (row.image_url as string | null) ?? null,
  };
}

/** Public order view. Deliberately omits pending_sale_id and sale_id. */
function toPublicOrder(row: Row): Omit<Order, "pendingSaleId" | "saleId"> {
  return {
    id: String(row.id),
    ref: String(row.ref),
    storeId: String(row.store_id),
    status: row.status as Order["status"],
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    fulfilmentMethod: row.fulfilment_method as Order["fulfilmentMethod"],
    items: (row.items as OrderItem[]) ?? [],
    totalQuantity: Number(row.total_quantity ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total ?? 0),
    currency: String(row.currency ?? "NGN"),
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    deliveryAddress: (row.delivery_address as string | null) ?? null,
    customerNote: (row.customer_note as string | null) ?? null,
    saleRef: (row.sale_ref as string | null) ?? null,
    declineReason: (row.decline_reason as string | null) ?? null,
    placedAt: String(row.placed_at),
    acceptedAt: (row.accepted_at as string | null) ?? null,
    dispatchedAt: (row.dispatched_at as string | null) ?? null,
    deliveredAt: (row.delivered_at as string | null) ?? null,
    updatedAt: String(row.updated_at),
  };
}

export type PublicOrder = ReturnType<typeof toPublicOrder>;

/** Mirrors the `stores_slug_format` CHECK constraint in schema.sql. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/**
 * Reduces a configured value to a bare slug.
 *
 * "The shop `/` opens" reads like it wants a link, so a full URL is the natural
 * thing to put in the env var — and `/${aFullUrl}` silently produces a mangled
 * path rather than an error. Accept a URL, a path, or a bare slug and keep the
 * first meaningful segment.
 */
function toSlug(value: string): string | null {
  let text = value.trim().replace(/^["']|["']$/g, "");
  if (!text) return null;

  if (text.includes("://")) {
    try {
      text = new URL(text).pathname;
    } catch {
      return null;
    }
  }

  const segment = text.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? "";
  const slug = segment.toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
}

/**
 * The shop to open when someone lands on "/" — the installed PWA's start_url
 * for a root install, or anyone typing the bare domain.
 *
 * `DEFAULT_STORE_SLUG` wins when set, and skips the database entirely. With no
 * config, a deployment serving exactly one published shop is unambiguous, so
 * use it. Two or more and there is no right answer, so fall through to the
 * landing page rather than guessing.
 */
export async function getDefaultStoreSlug(): Promise<string | null> {
  const configured = process.env.DEFAULT_STORE_SLUG;
  if (configured?.trim()) {
    const slug = toSlug(configured);
    if (slug) return slug;
    // Don't hard-fail on bad config: fall through to auto-detection, which is
    // usually right anyway, but say loudly why the setting was ignored.
    console.warn(
      `[queries] DEFAULT_STORE_SLUG="${configured}" is not a valid store slug ` +
        `— ignoring it. Use the slug alone, e.g. "store", not a full URL.`,
    );
  }

  try {
    const { data } = await db
      .from("stores")
      .select("slug")
      .eq("is_published", true)
      .limit(2);

    return data?.length === 1 ? String(data[0].slug) : null;
  } catch (err) {
    console.error("[queries] default store lookup failed:", err);
    return null;
  }
}

/**
 * Wrapped in React's `cache()` so one request hits Postgres once.
 *
 * Next deduplicates `fetch()` automatically, but supabase-js does not go
 * through that path — so without this, rendering the catalog looked up the same
 * store three times (layout, generateMetadata, page) and the same product list
 * twice, each a serial round trip to a remote database.
 *
 * The cache lives for a single server request only; there is no staleness
 * window and nothing to invalidate.
 */
export const getStoreBySlug = cache(
  async (slug: string): Promise<StoreProfile | null> => {
    const { data } = await db
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    return data ? toStoreProfile(data) : null;
  },
);

export const getStoreProducts = cache(
  async (storeId: string): Promise<StorefrontProduct[]> => {
    const { data } = await db
      .from("store_products")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    return (data ?? []).map(toProduct);
  },
);

export async function getOrderByToken(token: string): Promise<PublicOrder | null> {
  const { data } = await db
    .from("orders")
    .select("*")
    .eq("tracking_token", token)
    .maybeSingle();

  return data ? toPublicOrder(data) : null;
}

/** Cancels a customer's own order. Only legal while nobody has confirmed it. */
export async function cancelOrderByToken(
  token: string,
): Promise<PublicOrder | null> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("orders")
    .update({ status: "cancelled", updated_at: now })
    .eq("tracking_token", token)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (!data) return null;

  await db.from("order_events").insert({
    order_id: data.id,
    from_status: "pending",
    to_status: "cancelled",
    actor: "customer",
  });

  return toPublicOrder(data);
}

// ---------------------------------------------------------------------------
// Throttling
// ---------------------------------------------------------------------------

/**
 * Counts requests per (hashed IP, minute) in Postgres. In-memory buckets are
 * useless here — every serverless instance would keep its own.
 * Fails open: a broken throttle table must not stop real customers ordering.
 */
export async function consumeIpQuota(ip: string, limit: number): Promise<boolean> {
  const minute = new Date().toISOString().slice(0, 16).replace(/\D/g, "");
  const bucket = `${createHash("sha256").update(ip).digest("hex").slice(0, 32)}|${minute}`;

  try {
    const { data } = await db
      .from("order_throttle")
      .select("count")
      .eq("bucket", bucket)
      .maybeSingle();

    const count = Number(data?.count ?? 0);
    if (count >= limit) return false;

    await db
      .from("order_throttle")
      .upsert({ bucket, count: count + 1 }, { onConflict: "bucket" });

    return true;
  } catch (err) {
    console.error("[throttle] ip quota check failed:", err);
    return true;
  }
}

/**
 * Caps how many orders one customer can place at one store per hour.
 *
 * Keyed on customer_id rather than the phone string: orders store the number
 * exactly as the customer typed it (so the merchant can read and dial it),
 * which means the same person's "08088…" and "+23480 88…" are different
 * strings. The customers table normalizes, so its id is the stable identity.
 */
export async function withinCustomerQuota(
  storeId: string,
  customerId: string | null,
  limit: number,
): Promise<boolean> {
  if (!customerId) return true;

  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  try {
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .gte("placed_at", since);

    return (count ?? 0) < limit;
  } catch (err) {
    console.error("[throttle] customer quota check failed:", err);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Order placement
// ---------------------------------------------------------------------------

/**
 * Finds or creates the customer record. `phone` must be the NORMALIZED form —
 * it is the unique key that ties a returning customer to their history. The
 * number shown to the merchant lives on the order, not here.
 */
export async function upsertCustomer(
  normalizedPhone: string,
  name: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("customers")
    .upsert(
      { phone: normalizedPhone, name, updated_at: now },
      { onConflict: "phone" },
    )
    .select("id")
    .maybeSingle();

  return data ? String(data.id) : null;
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function createRef(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const byte of bytes) out += REF_ALPHABET[byte % REF_ALPHABET.length];
  return `OD-${out}`;
}

export interface NewOrder {
  storeId: string;
  customerId: string | null;
  items: OrderItem[];
  totalQuantity: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  fulfilmentMethod: FulfilmentMethod;
  customerName: string;
  /** As the customer typed it — this is what the merchant reads and dials. */
  customerPhone: string;
  deliveryAddress: string | null;
  customerNote: string | null;
}

export async function insertOrder(
  order: NewOrder,
): Promise<{ ref: string; trackingToken: string; total: number } | null> {
  // One retry covers a `(store_id, ref)` collision; the odds of two are nil.
  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = createRef();
    const trackingToken = randomBytes(32).toString("base64url");

    const { data, error } = await db
      .from("orders")
      .insert({
        store_id: order.storeId,
        customer_id: order.customerId,
        ref,
        tracking_token: trackingToken,
        items: order.items,
        total_quantity: order.totalQuantity,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        total: order.total,
        currency: order.currency,
        fulfilment_method: order.fulfilmentMethod,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        delivery_address: order.deliveryAddress,
        customer_note: order.customerNote,
      })
      .select("id, ref, tracking_token, total")
      .maybeSingle();

    if (data) {
      await db.from("order_events").insert({
        order_id: data.id,
        from_status: null,
        to_status: "pending",
        actor: "customer",
      });
      return {
        ref: String(data.ref),
        trackingToken: String(data.tracking_token),
        total: Number(data.total),
      };
    }

    if (error && !error.message.includes("orders_ref_unique_per_store")) {
      console.error("[orders] insert failed:", error);
      return null;
    }
  }

  return null;
}
