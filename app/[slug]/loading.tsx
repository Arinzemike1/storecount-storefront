import {
  Skeleton,
  SkeletonScreen,
} from "@/components/storefront/skeleton";

/**
 * Catalog (Home). Mirrors CatalogList: store name and description, search
 * field, category chips, then the two-up product grid.
 *
 * This is also the fallback for any store route without its own loading file.
 */
export default function CatalogLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4 px-5 pb-40">
      {/* Store name + description */}
      <div className="flex flex-col gap-2 pt-1">
        <Skeleton className="h-7 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Search field */}
      <Skeleton className="h-12 rounded-control" />

      {/* Category chips */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col bg-surface rounded-card border border-border overflow-hidden"
          >
            <Skeleton className="aspect-square rounded-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-5 w-1/2 mt-1" />
              <Skeleton className="h-9 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
