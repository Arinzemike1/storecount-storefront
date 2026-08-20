import {
  Skeleton,
  SkeletonCard,
  SkeletonScreen,
} from "@/components/storefront/skeleton";

/**
 * Cart. Mirrors CartView: line rows carrying a quantity stepper and a
 * right-aligned line total, then the totals card — plus the pinned bottom bar,
 * which is part of the layout the customer is looking at.
 */
export default function CartLoading() {
  return (
    <>
      <SkeletonScreen className="flex flex-col gap-4 px-5 pb-32">
        <SkeletonCard className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Quantity stepper */}
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="size-9 rounded-full" />
              </div>
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
          ))}
        </SkeletonCard>

        {/* Totals */}
        <SkeletonCard className="px-4 py-3.5 flex flex-col gap-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SkeletonCard>

        <Skeleton className="h-3 w-3/4 mx-auto" />
      </SkeletonScreen>

      {/* Pinned continue bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-safe">
        <div className="mx-auto max-w-md px-5 py-3">
          <Skeleton className="h-14 rounded-control" />
        </div>
      </div>
    </>
  );
}
