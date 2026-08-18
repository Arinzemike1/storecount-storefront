"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { CheckIcon, PhoneIcon } from "@/components/icons";
import { applySavedOrderStatuses } from "@/lib/cart";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import type { PublicOrder } from "@/lib/queries";
import type { OrderStatus, StoreProfile } from "@/lib/storefront-types";

const TIMELINE: { status: OrderStatus; label: string; blurb: string }[] = [
  {
    status: "pending",
    label: "Order placed",
    blurb: "Waiting for the shop to confirm.",
  },
  {
    status: "accepted",
    label: "Confirmed",
    blurb: "The shop is putting your order together.",
  },
  {
    status: "out_for_delivery",
    label: "On its way",
    blurb: "Your order has left the shop.",
  },
  { status: "delivered", label: "Delivered", blurb: "Enjoy!" },
];

const POLL_MS = 15_000;

export function OrderTracker({
  store,
  initialOrder,
  token,
}: {
  store: StoreProfile;
  initialOrder: PublicOrder;
  token: string;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const money = (amount: number) => formatMoney(amount, store);

  const closed =
    order.status === "delivered" ||
    order.status === "rejected" ||
    order.status === "cancelled";

  // Keep the device's saved copy in step, so the Orders badge clears the moment
  // this order settles rather than waiting for the next visit.
  useEffect(() => {
    applySavedOrderStatuses(new Map([[token, order.status]]));
  }, [token, order.status]);

  useEffect(() => {
    if (closed) return;

    let stopped = false;

    async function check() {
      if (stopped || document.hidden) return;
      try {
        const res = await fetch(`/api/orders/${token}`);
        if (!res.ok) return;
        const data = (await res.json()) as { order: PublicOrder };
        if (!stopped) setOrder(data.order);
      } catch {
        // Offline — try again on the next tick.
      }
    }

    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [token, closed]);

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${token}`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        order?: PublicOrder;
        message?: string;
      } | null;
      if (data?.order) setOrder(data.order);
      if (!res.ok) setError(data?.message ?? "Could not cancel.");
    } catch {
      setError("Could not reach the shop.");
    } finally {
      setCancelling(false);
    }
  }

  const current = TIMELINE.findIndex((stage) => stage.status === order.status);

  return (
    <main className="flex flex-col gap-5 px-5 pb-28">
      <div>
        <p className="text-[13px] text-ink-3">Order {order.ref}</p>
        <h2 className="text-[22px] font-bold text-ink">
          {order.status === "rejected"
            ? "Not accepted"
            : order.status === "cancelled"
              ? "Cancelled"
              : (TIMELINE[Math.max(0, current)]?.label ?? "Order placed")}
        </h2>
        <p className="text-[15px] text-ink-2">
          {order.status === "rejected"
            ? (order.declineReason ??
              `${store.name} couldn't take this order. You haven't been charged.`)
            : order.status === "cancelled"
              ? "This order was cancelled."
              : (TIMELINE[Math.max(0, current)]?.blurb ?? "")}
        </p>
      </div>

      {!closed || order.status === "delivered" ? (
        <Card className="px-4 py-4">
          <ol className="flex flex-col gap-3.5">
            {TIMELINE.map((stage, index) => {
              const reached = index <= current;
              return (
                <li key={stage.status} className="flex items-center gap-3">
                  <span
                    className={`size-7 rounded-full flex items-center justify-center shrink-0 ${
                      reached
                        ? "bg-primary text-on-primary"
                        : "bg-surface-2 text-ink-3"
                    }`}
                  >
                    {reached ? (
                      <CheckIcon className="size-4" strokeWidth={2.4} />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span
                    className={`text-[15px] ${
                      reached ? "font-semibold text-ink" : "text-ink-3"
                    }`}
                  >
                    {stage.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      ) : null}

      <Card className="divide-y divide-border">
        {order.items.map((item) => (
          <div
            key={item.productId}
            className="flex items-baseline justify-between gap-3 px-4 py-3"
          >
            <p className="text-[15px] text-ink flex-1 min-w-0 truncate">
              {item.name}
            </p>
            <p className="text-[13px] text-ink-3 shrink-0">
              {item.quantity} × {money(item.price)}
            </p>
            <p className="font-semibold text-ink shrink-0 tabular-nums">
              {money(item.price * item.quantity)}
            </p>
          </div>
        ))}
        <div className="px-4 py-3.5 flex flex-col gap-1">
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-[13px] text-ink-3">
              <span>Delivery</span>
              <span>{money(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-[17px] font-bold text-ink">
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
          <p className="text-[13px] text-ink-3">
            {order.paymentStatus === "paid" ? "Paid" : "Pay on delivery"}
          </p>
        </div>
      </Card>

      <Card className="px-4 py-3.5">
        <p className="text-[13px] text-ink-3">
          {order.fulfilmentMethod === "delivery" ? "Delivering to" : "Collect from"}
        </p>
        <p className="text-[15px] text-ink">
          {order.fulfilmentMethod === "delivery"
            ? order.deliveryAddress
            : (store.address ?? store.name)}
        </p>
        <p className="text-[13px] text-ink-3 mt-1">
          Placed {formatDate(order.placedAt)} at {formatTime(order.placedAt)}
        </p>
      </Card>

      {store.phone && (
        <a href={`tel:${store.phone}`} className="w-full">
          <Button full variant="secondary">
            <PhoneIcon className="size-5" /> Call {store.name}
          </Button>
        </a>
      )}

      {error && (
        <p className="text-[13px] text-danger font-medium" role="alert">
          {error}
        </p>
      )}

      {order.status === "pending" && (
        <Button full variant="ghost" loading={cancelling} onClick={cancel}>
          Cancel this order
        </Button>
      )}
    </main>
  );
}
