import type { NextRequest } from "next/server";
import {
  consumeIpQuota,
  getStoreBySlug,
  getStoreProducts,
  insertOrder,
  upsertCustomer,
  withinPhoneQuota,
} from "@/lib/queries";
import type { FulfilmentMethod, OrderItem } from "@/lib/storefront-types";

const MAX_ORDERS_PER_IP_PER_MINUTE = 5;
const MAX_ORDERS_PER_PHONE_PER_HOUR = 5;
const MAX_LINES = 50;

/** Same rule as the merchant app's lib/auth.ts normalizePhone. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0].trim() || "unknown";
}

/**
 * Places a customer order.
 *
 * Every number is recomputed here from `store_products`; the client's prices
 * and totals are never trusted. The client only says which products and how
 * many.
 */
export async function POST(request: NextRequest) {
  if (!(await consumeIpQuota(clientIp(request), MAX_ORDERS_PER_IP_PER_MINUTE))) {
    return Response.json(
      { error: "Too many orders from this connection. Please wait a minute." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const rawPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const fulfilmentMethod = body.fulfilmentMethod as FulfilmentMethod;
  const deliveryAddress =
    typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
  const customerNote =
    typeof body.customerNote === "string" ? body.customerNote.trim() : "";

  if (!slug || !customerName || normalizePhone(rawPhone).length < 7) {
    return Response.json(
      { error: "Please enter your name and a valid phone number." },
      { status: 400 },
    );
  }
  if (fulfilmentMethod !== "delivery" && fulfilmentMethod !== "pickup") {
    return Response.json({ error: "Invalid fulfilment method" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (body.items.length > MAX_LINES) {
    return Response.json({ error: "That's too many items." }, { status: 400 });
  }

  const store = await getStoreBySlug(slug);
  if (!store) return Response.json({ error: "Shop not found" }, { status: 404 });

  // The catalog disables ordering when closed, but a tab left open overnight
  // must not be able to sneak an order through.
  if (!store.isOpen) {
    return Response.json(
      { error: "store_closed", message: "This shop isn't taking orders now." },
      { status: 409 },
    );
  }

  if (fulfilmentMethod === "delivery" && !store.acceptsDelivery) {
    return Response.json({ error: "This shop doesn't deliver." }, { status: 400 });
  }
  if (fulfilmentMethod === "pickup" && !store.acceptsPickup) {
    return Response.json(
      { error: "This shop doesn't offer pickup." },
      { status: 400 },
    );
  }
  if (fulfilmentMethod === "delivery" && !deliveryAddress) {
    return Response.json({ error: "A delivery address is required." }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!(await withinPhoneQuota(store.id, phone, MAX_ORDERS_PER_PHONE_PER_HOUR))) {
    return Response.json(
      { error: "You've placed several orders already. Please call the shop." },
      { status: 429 },
    );
  }

  const catalog = await getStoreProducts(store.id);
  const byId = new Map(catalog.map((p) => [p.productId, p]));

  const items: OrderItem[] = [];
  let subtotal = 0;
  let totalQuantity = 0;

  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") {
      return Response.json({ error: "Invalid cart" }, { status: 400 });
    }
    const line = raw as Record<string, unknown>;
    const productId = String(line.productId ?? "");
    const quantity = Number(line.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return Response.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const product = byId.get(productId);
    if (!product) {
      return Response.json(
        { error: "item_unavailable", message: "An item is no longer available." },
        { status: 409 },
      );
    }

    // Only a hard zero blocks the order. availableQuantity is a stale hint by
    // design and the merchant confirms by hand, so rejecting on it would turn
    // away perfectly fillable orders.
    if (product.availableQuantity === 0) {
      return Response.json(
        {
          error: "item_unavailable",
          message: `${product.name} just sold out.`,
        },
        { status: 409 },
      );
    }

    items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity,
    });
    subtotal += product.price * quantity;
    totalQuantity += quantity;
  }

  subtotal = Math.round(subtotal * 100) / 100;

  if (subtotal < store.minOrderTotal) {
    return Response.json(
      { error: "below_minimum", message: "Your order is below the minimum." },
      { status: 409 },
    );
  }

  const deliveryFee = fulfilmentMethod === "delivery" ? store.deliveryFee : 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  const customerId = await upsertCustomer(phone, customerName);

  const created = await insertOrder({
    storeId: store.id,
    customerId,
    items,
    totalQuantity,
    subtotal,
    deliveryFee,
    total,
    currency: store.currency,
    fulfilmentMethod,
    customerName,
    customerPhone: phone,
    deliveryAddress: fulfilmentMethod === "delivery" ? deliveryAddress : null,
    customerNote: customerNote || null,
  });

  if (!created) {
    return Response.json({ error: "Could not place your order." }, { status: 500 });
  }

  return Response.json(created, { status: 201 });
}
