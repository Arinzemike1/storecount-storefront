import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/storefront/order-tracker";
import { getOrderByToken, getStoreBySlug } from "@/lib/queries";

export const metadata = {
  title: "Your order",
  // An order page must never end up in a search index.
  robots: { index: false, follow: false },
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const [store, order] = await Promise.all([
    getStoreBySlug(slug),
    getOrderByToken(token),
  ]);

  // Guard against a token from a different shop being replayed on this slug.
  if (!store || !order || order.storeId !== store.id) notFound();

  return <OrderTracker store={store} initialOrder={order} token={token} />;
}
