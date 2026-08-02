"use client";

import { localStorageAdapter, type StorageAdapter } from "./storage";

/**
 * A tiny observable store persisted through a StorageAdapter.
 *
 * Copied from the StoreCount merchant app so both surfaces share one state
 * idiom. Components subscribe via useSyncExternalStore.
 */
export class Store<T> {
  private value: T | undefined;
  private listeners = new Set<() => void>();

  constructor(
    private key: string,
    private fallback: T,
    private adapter: StorageAdapter = localStorageAdapter,
  ) {}

  get(): T {
    if (this.value === undefined) {
      this.value = this.adapter.read(this.key, this.fallback);
    }
    return this.value;
  }

  /** Snapshot used during SSR and hydration, before localStorage is readable. */
  getServerSnapshot = (): T => this.fallback;

  getSnapshot = (): T => this.get();

  set(next: T): void {
    this.value = next;
    this.adapter.write(this.key, next);
    this.listeners.forEach((listener) => listener());
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.get()));
  }

  reset(): void {
    this.value = this.fallback;
    this.adapter.remove(this.key);
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}
