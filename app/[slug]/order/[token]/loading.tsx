import {
  Skeleton,
  SkeletonCard,
  SkeletonScreen,
} from "@/components/storefront/skeleton";

/**
 * Order tracking. Mirrors OrderTracker: the reference and headline status, the
 * four-step timeline, the itemised list with totals, the fulfilment card, and
 * the call button.
 */
export default function OrderTrackingLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-5 px-5 pb-28">
      {/* Reference + headline status + blurb */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Four-step timeline */}
      <SkeletonCard className="px-4 py-4">
        <div className="flex flex-col gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Items, then totals */}
      <SkeletonCard className="divide-y divide-border">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
        <div className="px-4 py-3.5 flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
      </SkeletonCard>

      {/* Delivering to / collect from */}
      <SkeletonCard className="px-4 py-3.5 flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-40" />
      </SkeletonCard>

      <Skeleton className="h-14 rounded-control" />
    </SkeletonScreen>
  );
}
