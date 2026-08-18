"use client";

import { useSyncExternalStore } from "react";
import { Store } from "./store-base";
import type { OrderStatus } from "./storefront-types";

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
  /**
   * Last status we heard from the server. Absent on orders saved before this
   * field existed — treated as still in flight until a refresh says otherwise.
   */
  status?: OrderStatus;
}

/** Statuses where there is nothing left for the customer to wait on. */
const SETTLED: OrderStatus[] = ["delivered", "rejected", "cancelled"];

export function isOrderActive(order: SavedOrder): boolean {
  return !order.status || !SETTLED.includes(order.status);
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
  savedOrdersStore.update((all) =>
    [{ status: "pending" as OrderStatus, ...order }, ...all].slice(0, 50),
  );
}

/**
 * Folds freshly-read statuses into the saved list.
 *
 * Writes only when something actually changed. That matters: the store feeds
 * useSyncExternalStore, and an unconditional write would re-render every
 * subscriber, re-run the effect that fetched these statuses, and loop.
 */
export function applySavedOrderStatuses(next: Map<string, OrderStatus>): void {
  const all = savedOrdersStore.get();
  let changed = false;

  const updated = all.map((order) => {
    const status = next.get(order.trackingToken);
    if (!status || status === order.status) return order;
    changed = true;
    return { ...order, status };
  });

  if (changed) savedOrdersStore.set(updated);
}

/** Re-reads the status of every order saved on this device for one store. */
export async function refreshSavedOrderStatuses(slug: string): Promise<void> {
  const mine = savedOrdersStore.get().filter((order) => order.slug === slug);
  if (mine.length === 0) return;

  const entries = await Promise.all(
    mine.map(async (order) => {
      try {
        const res = await fetch(`/api/orders/${order.trackingToken}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { order: { status: OrderStatus } };
        return [order.trackingToken, data.order.status] as const;
      } catch {
        // Offline. The saved status stays as it was.
        return null;
      }
    }),
  );

  applySavedOrderStatuses(
    new Map(entries.filter((entry): entry is [string, OrderStatus] => entry !== null)),
  );
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
