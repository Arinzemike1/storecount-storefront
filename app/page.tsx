import { EmptyState } from "@/components/empty-state";
import { StoreIcon } from "@/components/icons";

/**
 * The root has no content of its own — every real page lives under a store
 * slug. Shown when someone lands on the bare domain.
 */
export default function LandingPage() {
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
