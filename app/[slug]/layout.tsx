import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/storefront/bottom-nav";
import { StoreHeader } from "@/components/storefront/store-header";
import { getStoreBySlug } from "@/lib/queries";

/**
 * Points every page under a store at that store's manifest, so "Add to home
 * screen" works from the catalog, the cart, or an order tracking page alike.
 * Only the slug is needed here — no extra query.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { manifest: `/${slug}/manifest.webmanifest` };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-md">
      <StoreHeader slug={slug} store={store} />
      <div className="flex-1 flex flex-col">{children}</div>
      <BottomNav slug={slug} />
    </div>
  );
}
