"use client";

import { useSyncExternalStore } from "react";
import { Store } from "./store-base";

export interface CartLine {
  productId: string;
  quantity: number;
}

/** A saved order the customer can come back to. This device only. */
export interface SavedOrder {
  slug: string;
  storeName: string;
  ref: string;
  trackingToken: string;
  total: number;
  placedAt: string;
}

/**
 * Carts are keyed per store so a customer can hold one at two shops at once.
 * Only ids and quantities are stored — never prices. Prices are re-read from
 * the catalog on render and recomputed server-side when the order is placed,
 * so a stale cart can never lock in an old price.
 */
const carts = new Map<string, Store<CartLine[]>>();

export function cartStoreFor(slug: string): Store<CartLine[]> {
  let store = carts.get(slug);
  if (!store) {
    store = new Store<CartLine[]>(`cart:${slug}`, []);
    carts.set(slug, store);
  }
  return store;
}

export function useCart(slug: string): CartLine[] {
  const store = cartStoreFor(slug);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

export function setCartQuantity(
  slug: string,
  productId: string,
  quantity: number,
): void {
  cartStoreFor(slug).update((lines) => {
    const next = lines.filter((line) => line.productId !== productId);
    if (quantity > 0) next.push({ productId, quantity });
    return next;
  });
}

export function clearCart(slug: string): void {
  cartStoreFor(slug).set([]);
}

/**
 * The Phase 1 "account": a list of orders placed from this device. No signup,
 * no OTP — the tracking token in each entry is the only credential.
 */
export const savedOrdersStore = new Store<SavedOrder[]>("orders", []);

export function useSavedOrders(): SavedOrder[] {
  return useSyncExternalStore(
    savedOrdersStore.subscribe,
    savedOrdersStore.getSnapshot,
    savedOrdersStore.getServerSnapshot,
  );
}

export function rememberOrder(order: SavedOrder): void {
  savedOrdersStore.update((all) => [order, ...all].slice(0, 50));
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
