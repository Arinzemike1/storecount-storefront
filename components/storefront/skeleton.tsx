import type { ReactNode } from "react";

/**
 * Building blocks for the per-screen loading states.
 *
 * A skeleton earns its keep only if it matches the screen it stands in for —
 * same block sizes, same rhythm, same padding — so the real content fills in
 * rather than displacing what the customer was already looking at.
 */

/** A single pulsing block. Defaults to a text-line height. */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden className={`rounded bg-surface-2 animate-pulse ${className}`} />;
}

/**
 * Wraps a screen's skeleton. Carries the busy state and the only text a screen
 * reader should hear — the shapes themselves are decorative.
 */
export function SkeletonScreen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </main>
  );
}

/** Matches the `Card` component's shell so rows line up with the real thing. */
export function SkeletonCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface rounded-card border border-border ${className}`}>
      {children}
    </div>
  );
}
