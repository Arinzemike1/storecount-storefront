import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogList } from "@/components/storefront/catalog-list";
import { getStoreBySlug, getStoreProducts } from "@/lib/queries";

/**
 * WhatsApp is how these links actually travel, and a link with no preview
 * reads as spam. This is the highest-leverage code in the storefront.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return { title: "Shop not found" };

  const products = await getStoreProducts(store.id);
  const image = products.find((p) => p.imageUrl)?.imageUrl;
  const description =
    store.description ??
    (products.length > 0
      ? `Order ${products
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ")} and more.`
      : "Order online.");

  return {
    title: store.name,
    description,
    openGraph: {
      title: store.name,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const products = await getStoreProducts(store.id);

  return <CatalogList slug={slug} store={store} products={products} />;
}
