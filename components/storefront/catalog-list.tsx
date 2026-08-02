"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { BoxIcon, MinusIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { setCartQuantity, useCart, useHydrated } from "@/lib/cart";
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

  const quantities = useMemo(
    () => new Map(cart.map((line) => [line.productId, line.quantity])),
    [cart],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [products, query]);

  const money = (amount: number) => formatMoney(amount, store);
  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => {
    const product = products.find((p) => p.productId === line.productId);
    return sum + (product ? product.price * line.quantity : 0);
  }, 0);

  if (products.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
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
      <main className="flex flex-col gap-4 px-5 pb-32">
        {store.description && (
          <p className="text-[15px] text-ink-2">{store.description}</p>
        )}

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

        {visible.length === 0 ? (
          <p className="text-center text-[15px] text-ink-2 py-12">
            Nothing matches your search.
          </p>
        ) : (
          <Card className="divide-y divide-border">
            {visible.map((product) => {
              const quantity = quantities.get(product.productId) ?? 0;
              const soldOut = product.availableQuantity === 0;
              // Over-ask above zero is allowed on purpose: availableQuantity is
              // a stale hint, and the shop confirms every order by hand.
              const canOrder = store.isOpen && !soldOut;

              return (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="size-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <span className="size-14 rounded-xl bg-surface-2 text-ink-3 flex items-center justify-center shrink-0">
                      <BoxIcon className="size-6" />
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-[15px] truncate">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="text-[13px] text-ink-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <p
                      className={`text-[15px] font-bold ${soldOut ? "text-ink-3" : "text-ink"}`}
                    >
                      {money(product.price)}
                      {soldOut && (
                        <span className="ml-2 text-[13px] font-medium text-ink-3">
                          Sold out
                        </span>
                      )}
                    </p>
                  </div>

                  {canOrder &&
                    (quantity === 0 ? (
                      <button
                        onClick={() =>
                          setCartQuantity(slug, product.productId, 1)
                        }
                        className="h-9 px-4 rounded-full bg-primary text-on-primary text-[13px] font-semibold shrink-0 active:scale-95 transition-transform"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          aria-label={`Remove one ${product.name}`}
                          onClick={() =>
                            setCartQuantity(slug, product.productId, quantity - 1)
                          }
                          className="size-9 rounded-full bg-surface-2 text-ink flex items-center justify-center active:scale-95"
                        >
                          <MinusIcon className="size-4" />
                        </button>
                        <span className="w-5 text-center font-bold tabular-nums">
                          {quantity}
                        </span>
                        <button
                          aria-label={`Add one ${product.name}`}
                          onClick={() =>
                            setCartQuantity(slug, product.productId, quantity + 1)
                          }
                          className="size-9 rounded-full bg-surface-2 text-ink flex items-center justify-center active:scale-95"
                        >
                          <PlusIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                </div>
              );
            })}
          </Card>
        )}

        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="text-center text-[15px] font-semibold text-primary py-2"
          >
            Call the shop
          </a>
        )}
      </main>

      {/* Cart bar. Hidden until hydration so SSR and client agree. */}
      {hydrated && totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 pb-safe">
          <div className="mx-auto max-w-md px-5 pb-4">
            <Link
              href={`/${slug}/cart`}
              className="flex items-center justify-between gap-3 h-14 px-5 rounded-control bg-primary text-on-primary shadow-float active:scale-[0.98] transition-transform"
            >
              <span className="font-semibold">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
              <span className="font-bold">{money(subtotal)}</span>
              <span className="font-semibold">View cart</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
