import { notFound } from "next/navigation";
import { CartView } from "@/components/storefront/cart-view";
import { getStoreBySlug, getStoreProducts } from "@/lib/queries";

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const products = await getStoreProducts(store.id);
  return <CartView slug={slug} store={store} products={products} />;
}
