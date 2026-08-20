"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, PhoneIcon } from "@/components/icons";
import type { StoreProfile } from "@/lib/storefront-types";
import Image from "next/image";

/**
 * Where "back" goes from each step of the ordering flow.
 *
 * These are explicit destinations rather than router.back(): a customer who
 * opened the cart from a shared link, or who landed on checkout after a
 * refresh, has no useful history to pop, and back() would walk them off the
 * site. Walking up the flow is always right.
 */
function backHrefFor(pathname: string, slug: string): string | null {
  if (pathname.endsWith("/checkout")) return `/${slug}/cart`;
  if (pathname.endsWith("/cart")) return `/${slug}`;
  // A tracked order belongs to the saved-orders list, whether it was reached
  // from there or from the link handed out at checkout. Matched on the token
  // segment so the list itself (/orders) doesn't catch this.
  if (/\/order\/[^/]+$/.test(pathname)) return `/${slug}/orders`;
  return null;
}

export function StoreHeader({
  slug,
  store,
}: {
  slug: string;
  store: StoreProfile;
}) {
  const pathname = usePathname();
  const backHref = backHrefFor(pathname, slug);

  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur pt-safe">
      <div className="px-5 h-16 flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="-ml-2 size-10 shrink-0 rounded-full flex items-center justify-center text-ink active:bg-surface-2 transition-colors"
          >
            <ArrowLeftIcon className="size-6" />
          </Link>
        )}

        <Link href={`/${slug}`} aria-label={`${store.name} home`} className="min-w-0">
          {/* Placeholder art lives at public/logo.svg — replace that file. The
              store name rides along as alt text so the shop is still
              identifiable to screen readers and link previews. */}
          {/* <img src="/logo.svg" alt={store.name} className="h-7 w-auto" /> */}
          <Image src="/3bro-logo.png" alt={store.name} width={120} height={40} />
        </Link>

        {/* Reaching a human is the fallback for everything the storefront
            can't do, so it belongs in reach on every screen rather than
            buried under the catalog. */}
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="ml-auto shrink-0 h-9 pl-3 pr-3.5 rounded-full border border-border-strong bg-surface text-primary flex items-center gap-1.5 text-[13px] font-semibold active:scale-95 transition-transform"
          >
            <PhoneIcon className="size-4" />
            Call
          </a>
        )}
      </div>

      {!store.isOpen && (
        <p className="bg-warning-soft text-warning text-[13px] font-medium px-5 py-2">
          This shop isn&apos;t taking orders right now. Have a look around and
          check back soon.
        </p>
      )}
    </header>
  );
}
