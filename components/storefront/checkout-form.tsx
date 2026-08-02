"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Field } from "@/components/input";
import { clearCart, rememberOrder, useCart, useHydrated } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import type {
  FulfilmentMethod,
  PlaceOrderResponse,
  StoreProfile,
  StorefrontProduct,
} from "@/lib/storefront-types";

export function CheckoutForm({
  slug,
  store,
  products,
}: {
  slug: string;
  store: StoreProfile;
  products: StorefrontProduct[];
}) {
  const router = useRouter();
  const cart = useCart(slug);
  const hydrated = useHydrated();
  const money = (amount: number) => formatMoney(amount, store);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<FulfilmentMethod>(
    store.acceptsDelivery ? "delivery" : "pickup",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const product = products.find((p) => p.productId === line.productId);
        return sum + (product ? product.price * line.quantity : 0);
      }, 0),
    [cart, products],
  );

  const deliveryFee = method === "delivery" ? store.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const bothMethods = store.acceptsDelivery && store.acceptsPickup;

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name";
    // Deliberately loose: real numbers here come in many shapes.
    if (phone.replace(/\D/g, "").length < 7) {
      next.phone = "Enter a number the shop can reach you on";
    }
    if (method === "delivery" && !address.trim()) {
      next.address = "Where should they deliver to?";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setFailure(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          items: cart,
          fulfilmentMethod: method,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          deliveryAddress: method === "delivery" ? address.trim() : undefined,
          customerNote: note.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | (PlaceOrderResponse & { error?: string })
        | null;

      if (!res.ok || !data?.trackingToken) {
        setFailure(data?.error ?? "Could not place your order. Please try again.");
        setBusy(false);
        return;
      }

      rememberOrder({
        slug,
        storeName: store.name,
        ref: data.ref,
        trackingToken: data.trackingToken,
        total: data.total,
        placedAt: new Date().toISOString(),
      });
      clearCart(slug);
      router.replace(`/${slug}/order/${data.trackingToken}`);
    } catch {
      setFailure("Could not reach the shop. Check your connection.");
      setBusy(false);
    }
  }

  if (!hydrated) return null;

  if (cart.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="text-[15px] text-ink-2 text-center">
          Your cart is empty.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5 px-5 pb-8">
      {bothMethods && (
        <div className="grid grid-cols-2 gap-2">
          {(["delivery", "pickup"] as FulfilmentMethod[]).map((option) => (
            <button
              key={option}
              onClick={() => setMethod(option)}
              className={`h-12 rounded-control text-[15px] font-semibold border transition-colors ${
                method === option
                  ? "bg-ink text-white border-ink"
                  : "bg-surface text-ink-2 border-border-strong"
              }`}
            >
              {option === "delivery" ? "Deliver to me" : "I'll collect"}
            </button>
          ))}
        </div>
      )}

      <Field
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="So they know who to expect"
        autoFocus
      />

      <Field
        label="Phone number"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        placeholder="080…"
        hint="The shop will call this number to confirm."
      />

      {method === "delivery" && (
        <Field
          label="Delivery address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
          placeholder="Street, area, landmark"
        />
      )}

      {method === "pickup" && store.address && (
        <Card className="px-4 py-3.5">
          <p className="text-[13px] text-ink-3">Collect from</p>
          <p className="text-[15px] text-ink">{store.address}</p>
        </Card>
      )}

      <Field
        label="Anything else? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Call when you arrive"
      />

      <Card className="px-4 py-3.5 flex flex-col gap-1.5">
        <div className="flex justify-between text-[15px] text-ink-2">
          <span>Goods</span>
          <span>{money(subtotal)}</span>
        </div>
        {method === "delivery" && deliveryFee > 0 && (
          <div className="flex justify-between text-[15px] text-ink-2">
            <span>Delivery</span>
            <span>{money(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-[17px] font-bold text-ink pt-1 border-t border-border mt-1">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
        <p className="text-[13px] text-ink-3">Pay when you receive your order.</p>
      </Card>

      {failure && (
        <p className="text-[13px] text-danger font-medium" role="alert">
          {failure}
        </p>
      )}

      <Button full loading={busy} onClick={submit}>
        Place order
      </Button>

      <p className="text-[13px] text-ink-3 text-center">
        {store.name} will confirm what they can supply before packing your order.
      </p>
    </main>
  );
}
