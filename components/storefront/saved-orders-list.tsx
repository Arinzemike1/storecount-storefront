"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { ChevronRightIcon, ReceiptIcon } from "@/components/icons";
import {
  refreshSavedOrderStatuses,
  useHydrated,
  useSavedOrders,
} from "@/lib/cart";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import type { OrderStatus, StoreProfile } from "@/lib/storefront-types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Waiting for confirmation",
  accepted: "Confirmed",
  out_for_delivery: "On its way",
  delivered: "Delivered",
  rejected: "Not accepted",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "text-warning",
  accepted: "text-primary",
  out_for_delivery: "text-primary",
  delivered: "text-success",
  rejected: "text-ink-3",
  cancelled: "text-ink-3",
};

export function SavedOrdersList({
  slug,
  store,
}: {
  slug: string;
  store: StoreProfile;
}) {
  const saved = useSavedOrders();
  const hydrated = useHydrated();
  const money = (amount: number) => formatMoney(amount, store);

  const orders = useMemo(
    () => saved.filter((order) => order.slug === slug),
    [saved, slug],
  );

  // The saved list is a local record of what was placed; only the server knows
  // where each one has got to since. Statuses live on the saved order itself so
  // this screen and the tab-bar badge read the same thing.
  useEffect(() => {
    void refreshSavedOrderStatuses(slug);
  }, [slug]);

  if (!hydrated) return null;

  if (orders.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 pb-24">
        <EmptyState
          icon={<ReceiptIcon />}
          title="No orders yet"
          message={`Orders you place from ${store.name} will show up here.`}
          action={
            <Link href={`/${slug}`}>
              <Button size="md">Start shopping</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 px-5 pb-28">
      <p className="text-[13px] text-ink-3">
        Orders placed on this device. They stay here even if you close the page.
      </p>

      <Card className="divide-y divide-border">
        {orders.map((order) => {
          const status = order.status;
          return (
            <Link
              key={order.trackingToken}
              href={`/${slug}/order/${order.trackingToken}`}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-2 first:rounded-t-card last:rounded-b-card"
            >
              <span className="size-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <ReceiptIcon className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-[15px]">{order.ref}</p>
                <p className="text-[13px] text-ink-3">
                  {formatDate(order.placedAt)} · {formatTime(order.placedAt)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-ink">{money(order.total)}</p>
                <p
                  className={`text-[13px] font-medium ${
                    status ? STATUS_TONE[status] : "text-ink-3"
                  }`}
                >
                  {status ? STATUS_LABEL[status] : "…"}
                </p>
              </div>
              <ChevronRightIcon className="size-4 text-ink-3 shrink-0" />
            </Link>
          );
        })}
      </Card>
    </main>
  );
}
