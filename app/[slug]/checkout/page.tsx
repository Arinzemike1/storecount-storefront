import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getStoreBySlug, getStoreProducts } from "@/lib/queries";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const products = await getStoreProducts(store.id);
  return <CheckoutForm slug={slug} store={store} products={products} />;
}
