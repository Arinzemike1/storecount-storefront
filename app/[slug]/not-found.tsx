import { EmptyState } from "@/components/empty-state";
import { StoreIcon } from "@/components/icons";

export default function StoreNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <EmptyState
        icon={<StoreIcon />}
        title="Shop not found"
        message="This link may have changed. Ask the shop for their current link."
      />
    </main>
  );
}
