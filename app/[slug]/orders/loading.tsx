import {
  Skeleton,
  SkeletonCard,
  SkeletonScreen,
} from "@/components/storefront/skeleton";

/**
 * Orders. Mirrors SavedOrdersList: an intro line, then a single divided card of
 * rows — square icon, reference and date on the left, total and status right.
 */
export default function OrdersLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4 px-5 pb-28">
      <Skeleton className="h-4 w-4/5" />

      <SkeletonCard className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </SkeletonScreen>
  );
}
