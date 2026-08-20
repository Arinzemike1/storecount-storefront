import {
  Skeleton,
  SkeletonCard,
  SkeletonScreen,
} from "@/components/storefront/skeleton";

/** A labelled input, as rendered by the `Field` component. */
function FieldSkeleton({ hint = false }: { hint?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 rounded-control" />
      {hint && <Skeleton className="h-3 w-2/3" />}
    </div>
  );
}

/**
 * Checkout. Mirrors CheckoutForm: the delivery/pickup toggle, a stack of
 * labelled fields, the totals card, then the submit button and its footnote.
 */
export default function CheckoutLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-5 px-5 pb-8">
      {/* Deliver / collect toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-control" />
        <Skeleton className="h-12 rounded-control" />
      </div>

      <FieldSkeleton />
      <FieldSkeleton hint />
      <FieldSkeleton />
      <FieldSkeleton />

      {/* Totals */}
      <SkeletonCard className="px-4 py-3.5 flex flex-col gap-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between pt-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-24" />
        </div>
      </SkeletonCard>

      <Skeleton className="h-14 rounded-control" />
      <Skeleton className="h-3 w-4/5 mx-auto" />
    </SkeletonScreen>
  );
}
