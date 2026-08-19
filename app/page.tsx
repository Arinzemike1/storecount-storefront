import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { StoreIcon } from "@/components/icons";
import { getDefaultStoreSlug } from "@/lib/queries";

/**
 * Resolved per request, not at build time. Prerendering would bake in whichever
 * answer was true during the build — so a shop published after deploy would
 * leave "/" stuck on "Nothing here" until someone redeployed. The cost is one
 * indexed query, and none at all when DEFAULT_STORE_SLUG is set.
 */
export const dynamic = "force-dynamic";

/**
 * The root has no content of its own — every real page lives under a store
 * slug. Send visitors straight to the default shop so opening the installed
 * app, or typing the bare domain, lands somewhere useful.
 *
 * The message below is the genuine no-shop-configured case, not a landing page.
 */
export default async function RootPage() {
  const slug = await getDefaultStoreSlug();

  // Temporary (307), not permanent: which shop is "default" can change, and a
  // 308 would be cached by browsers indefinitely and be painful to undo.
  if (slug) redirect(`/${slug}`);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <EmptyState
        icon={<StoreIcon />}
        title="Nothing here"
        message="Open the link your shop sent you to browse what they have and place an order."
      />
    </main>
  );
}
