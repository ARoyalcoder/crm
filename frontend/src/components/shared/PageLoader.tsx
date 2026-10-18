import { Skeleton } from '@/components/ui/skeleton'

/** Route-level loading placeholder shown while a lazily loaded page downloads. */
export function PageLoader() {
  return (
    <div role="status" aria-label="Loading page" className="grid gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
