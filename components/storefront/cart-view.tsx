"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { CartIcon, MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { setCartQuantity, useCart, useHydrated } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import type { StoreProfile, StorefrontProduct } from "@/lib/storefront-types";

export function CartView({
  slug,
  store,
  products,
}: {
  slug: string;
  store: StoreProfile;
  products: StorefrontProduct[];
}) {
  const cart = useCart(slug);
  const hydrated = useHydrated();
  const money = (amount: number) => formatMoney(amount, store);

  const lines = useMemo(
    () =>
      cart
        .map((line) => ({
          line,
          product: products.find((p) => p.productId === line.productId),
        }))
        .filter(
          (entry): entry is { line: typeof entry.line; product: StorefrontProduct } =>
            Boolean(entry.product),
        ),
    [cart, products],
  );

  const subtotal = lines.reduce(
    (sum, { line, product }) => sum + product.price * line.quantity,
    0,
  );
  const belowMinimum = subtotal < store.minOrderTotal;

  if (!hydrated) return null;

  if (lines.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <EmptyState
          icon={<CartIcon />}
          title="Your cart is empty"
          message="Add a few things and they'll show up here."
          action={
            <Link href={`/${slug}`}>
              <Button size="md">Browse products</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col gap-4 px-5 pb-32">
        <Card className="divide-y divide-border">
          {lines.map(({ line, product }) => (
            <div
              key={product.productId}
              className="flex items-center gap-2.5 px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-[15px] truncate">
                  {product.name}
                </p>
                <p className="text-[13px] text-ink-3">
                  {money(product.price)} each
                </p>
                {product.availableQuantity === 0 && (
                  <p className="text-[13px] text-danger font-medium">
                    Sold out — remove to continue
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  aria-label={`Remove one ${product.name}`}
                  onClick={() =>
                    setCartQuantity(slug, product.productId, line.quantity - 1)
                  }
                  className="size-9 rounded-full bg-surface-2 text-ink flex items-center justify-center active:scale-95"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span className="w-5 text-center font-bold tabular-nums">
                  {line.quantity}
                </span>
                <button
                  aria-label={`Add one ${product.name}`}
                  onClick={() =>
                    setCartQuantity(slug, product.productId, line.quantity + 1)
                  }
                  className="size-9 rounded-full bg-surface-2 text-ink flex items-center justify-center active:scale-95"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <p className="w-20 text-right font-semibold text-ink tabular-nums">
                {money(product.price * line.quantity)}
              </p>

              {/* Dropping a line takes one tap here rather than holding the
                  minus button down to zero. Negative margin lets the icon sit
                  flush right against the card's padding. */}
              <button
                type="button"
                aria-label={`Remove ${product.name} from cart`}
                onClick={() => setCartQuantity(slug, product.productId, 0)}
                className="-mr-1 size-9 shrink-0 rounded-full flex items-center justify-center text-ink-3 active:bg-danger-soft active:text-danger transition-colors"
              >
                <TrashIcon className="size-4.5" />
              </button>
            </div>
          ))}
        </Card>

        <Card className="px-4 py-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-[15px] text-ink-2">
            <span>Goods</span>
            <span>{money(subtotal)}</span>
          </div>
          {store.acceptsDelivery && store.deliveryFee > 0 && (
            <div className="flex justify-between text-[13px] text-ink-3">
              <span>Delivery from</span>
              <span>{money(store.deliveryFee)}</span>
            </div>
          )}
          {store.deliveryNote && (
            <p className="text-[13px] text-ink-3">{store.deliveryNote}</p>
          )}
        </Card>

        <p className="text-[13px] text-ink-3 text-center">
          {store.name} confirms every order before packing it. Nothing is charged
          until then.
        </p>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-safe">
        <div className="mx-auto max-w-md px-5 py-3 flex flex-col gap-2">
          {belowMinimum && (
            <p className="text-[13px] text-warning font-medium text-center">
              Minimum order is {money(store.minOrderTotal)} — add{" "}
              {money(store.minOrderTotal - subtotal)} more.
            </p>
          )}
          <Link href={`/${slug}/checkout`} className="w-full">
            <Button full disabled={!store.isOpen || belowMinimum}>
              {store.isOpen ? "Continue" : "Shop is closed"}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
