import { notFound } from "next/navigation";
import { SavedOrdersList } from "@/components/storefront/saved-orders-list";
import { getStoreBySlug } from "@/lib/queries";

export const metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export default async function SavedOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  return <SavedOrdersList slug={slug} store={store} />;
}
