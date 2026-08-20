"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { EmptyState } from "@/components/empty-state";
import {
  BoxIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import { NAV_OFFSET } from "@/components/storefront/bottom-nav";
import { clearCart, setCartQuantity, useCart, useHydrated } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import type { StoreProfile, StorefrontProduct } from "@/lib/storefront-types";

interface CatalogListProps {
  slug: string;
  store: StoreProfile;
  products: StorefrontProduct[];
}

export function CatalogList({ slug, store, products }: CatalogListProps) {
  const cart = useCart(slug);
  const hydrated = useHydrated();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const money = (amount: number) => formatMoney(amount, store);

  const quantities = useMemo(
    () => new Map(cart.map((line) => [line.productId, line.quantity])),
    [cart],
  );

  const categories = useMemo(
    () => [
      ...new Set(
        products
          .map((p) => p.category?.trim())
          .filter((c): c is string => Boolean(c)),
      ),
    ],
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category?.trim() !== category) return false;
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q)
      );
    });
  }, [products, query, category]);

  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => {
    const product = products.find((p) => p.productId === line.productId);
    return sum + (product ? product.price * line.quantity : 0);
  }, 0);

  if (products.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 pb-24">
        <EmptyState
          icon={<BoxIcon />}
          title="Nothing listed yet"
          message={`${store.name} hasn't put anything online yet. Check back soon.`}
        />
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col gap-4 px-5 pb-40">
        <div>
          {/* <h2 className="text-[26px] font-bold tracking-tight text-ink leading-tight">
            {store.name}
          </h2> */}
          {store.description && (
            <p className="text-[15px] text-ink-2 mt-0.5">{store.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 bg-surface border border-border-strong rounded-control px-4 h-12 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
          <SearchIcon className="size-5 text-ink-3 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-[16px] text-ink placeholder:text-ink-3 outline-none"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-none">
            <CategoryChip
              label="All"
              active={category === null}
              onClick={() => setCategory(null)}
            />
            {categories.map((name) => (
              <CategoryChip
                key={name}
                label={name}
                active={category === name}
                onClick={() => setCategory(name)}
              />
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="text-center text-[15px] text-ink-2 py-12">
            Nothing matches your search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((product) => (
              <ProductCard
                key={product.productId}
                slug={slug}
                product={product}
                quantity={quantities.get(product.productId) ?? 0}
                canOrder={store.isOpen && product.availableQuantity > 0}
                money={money}
              />
            ))}
          </div>
        )}

      </main>

      {/* Cart bar. Sits above the tab bar, and stays hidden until hydration so
          the server and client markup agree. */}
      {hydrated && totalItems > 0 && (
        <div
          className="fixed inset-x-0 z-30 px-5 pb-3"
          style={{ bottom: NAV_OFFSET }}
        >
          {/* The link and the empty-cart button are siblings rather than nested:
              a button inside an anchor is invalid, and tapping "clear" must not
              also navigate to the cart. */}
          <div className="mx-auto max-w-md flex items-center gap-3 h-14 pl-5 pr-2 rounded-control bg-primary text-on-primary shadow-float">
            <Link
              href={`/${slug}/cart`}
              className="flex-1 min-w-0 h-full flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="size-6 rounded-full bg-on-primary/20 text-[12px] font-bold flex items-center justify-center">
                  {totalItems}
                </span>
                View cart
              </span>
              <span className="font-bold">{money(subtotal)}</span>
            </Link>

            <button
              type="button"
              aria-label="Empty cart"
              onClick={() => setConfirmingClear(true)}
              className="size-10 shrink-0 rounded-full flex items-center justify-center text-on-primary/75 active:bg-on-primary/15 active:text-on-primary transition-colors"
            >
              <TrashIcon className="size-5" />
            </button>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={confirmingClear}
        destructive
        title="Remove all items?"
        message="Everything in your cart will be cleared. This can't be undone."
        onConfirm={() => {
          clearCart(slug);
          setConfirmingClear(false);
        }}
        onClose={() => setConfirmingClear(false)}
      />
    </>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
        active
          ? "bg-ink text-white border-ink"
          : "bg-surface text-ink-2 border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({
  slug,
  product,
  quantity,
  canOrder,
  money,
}: {
  slug: string;
  product: StorefrontProduct;
  quantity: number;
  canOrder: boolean;
  money: (amount: number) => string;
}) {
  const soldOut = product.availableQuantity === 0;

  return (
    <article className="flex flex-col bg-surface rounded-card border border-border overflow-hidden shadow-card">
      <div className="relative aspect-square bg-surface-2">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className={`size-full object-cover ${soldOut ? "opacity-40" : ""}`}
          />
        ) : (
          <span className="size-full flex items-center justify-center text-ink-3">
            <BoxIcon className="size-9" />
          </span>
        )}

        {soldOut && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-ink/85 text-white text-[11px] font-semibold">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 gap-0.5 p-3">
        <h3 className="font-semibold text-ink text-[15px] leading-snug line-clamp-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-[13px] text-ink-3 leading-snug line-clamp-2">
            {product.description}
          </p>
        )}

        {/* mt-auto pins the footer to the bottom so cards line up despite
            different title and description lengths. Price and control are
            stacked, not side by side: a two-up card is only ~136px wide inside
            its padding, and a five-figure price next to a stepper overflows. */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          <p
            className={`font-bold tabular-nums ${soldOut ? "text-ink-3" : "text-ink"}`}
          >
            {money(product.price)}
          </p>

          {canOrder &&
            (quantity === 0 ? (
              <button
                onClick={() => setCartQuantity(slug, product.productId, 1)}
                className="h-9 w-full rounded-full bg-primary text-on-primary text-[13px] font-semibold flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <PlusIcon className="size-4" strokeWidth={2.4} />
                Add
              </button>
            ) : (
              <div className="h-9 w-full rounded-full bg-surface-2 flex items-center justify-between px-1">
                <button
                  aria-label={`Remove one ${product.name}`}
                  onClick={() =>
                    setCartQuantity(slug, product.productId, quantity - 1)
                  }
                  className="size-7 rounded-full bg-surface text-ink flex items-center justify-center shadow-card active:scale-90 transition-transform"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span className="text-[15px] font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  aria-label={`Add one ${product.name}`}
                  onClick={() =>
                    setCartQuantity(slug, product.productId, quantity + 1)
                  }
                  className="size-7 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-90 transition-transform"
                >
                  <PlusIcon className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            ))}
        </div>
      </div>
    </article>
  );
}
