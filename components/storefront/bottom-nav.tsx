"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, ReceiptIcon } from "@/components/icons";
import {
  isOrderActive,
  refreshSavedOrderStatuses,
  useHydrated,
  useSavedOrders,
} from "@/lib/cart";

/**
 * Height of the nav bar itself, excluding the safe-area inset. Pages that pin
 * something to the bottom stack above `NAV_OFFSET`.
 */
export const NAV_OFFSET = "calc(4rem + env(safe-area-inset-bottom))";

/**
 * Cart and checkout are a focused flow with their own bottom CTA, so the nav
 * steps out of the way there. Everywhere else it is the way back — without it
 * a customer who has just placed an order is stranded on the tracking page.
 */
const HIDDEN_ON = ["/cart", "/checkout"];

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const savedOrders = useSavedOrders();
  const hydrated = useHydrated();

  // The nav lives in the store layout, so this runs once per store visit
  // rather than on every navigation within it.
  useEffect(() => {
    void refreshSavedOrderStatuses(slug);
  }, [slug]);

  if (HIDDEN_ON.some((segment) => pathname.endsWith(segment))) return null;

  // Only orders still in flight. A delivered, declined, or cancelled order has
  // nothing left to check on, so badging it is just noise.
  const orderCount = hydrated
    ? savedOrders.filter((order) => order.slug === slug && isOrderActive(order))
        .length
    : 0;

  const tabs = [
    { href: `/${slug}`, label: "Home", icon: HomeIcon, exact: true },
    {
      href: `/${slug}/orders`,
      label: "Orders",
      icon: ReceiptIcon,
      exact: false,
      badge: orderCount,
    },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border pb-safe"
    >
      <div className="mx-auto max-w-md grid grid-cols-2">
        {tabs.map(({ href, label, icon: TabIcon, exact, badge }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-ink-3 active:text-ink-2"
              }`}
            >
              <span className="relative">
                <TabIcon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
                {badge ? (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
                    {badge}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
