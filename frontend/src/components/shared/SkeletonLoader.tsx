import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type SkeletonLoaderProps = {
  /**
   * What is loading, so the placeholder has the same shape as the content that replaces it:
   * `kpis` a row of stat tiles, `chart` a plot area, `table` rows, `list` stacked lines, `card` a block, `page` a whole screen.
   */
  variant: 'kpis' | 'chart' | 'table' | 'list' | 'card' | 'page'
  /** Rows (table/list) or tiles (kpis). */
  count?: number
  /** Plot height for `chart`. */
  height?: number
  /** Announced to screen readers: "Loading revenue". */
  label?: string
  className?: string
}

/** Loading placeholders. They pulse (unless reduced motion is on) and announce themselves as a status. */
export function SkeletonLoader({ variant, count, height = 240, label = 'Loading', className }: SkeletonLoaderProps) {
  const wrap = (children: React.ReactNode) => (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  )

  switch (variant) {
    case 'kpis':
      return wrap(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: count ?? 4 }, (_, i) => (
            <Card key={i} className="gap-3 p-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-9 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3.5 w-32" />
            </Card>
          ))}
        </div>,
      )
    case 'chart':
      return wrap(<Skeleton className="w-full rounded-xl" style={{ height }} />)
    case 'table':
      return wrap(
        <div className="grid gap-2">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: count ?? 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>,
      )
    case 'list':
      return wrap(
        <div className="grid gap-3">
          {Array.from({ length: count ?? 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>,
      )
    case 'card':
      return wrap(<Skeleton className={cn('w-full rounded-2xl')} style={{ height }} />)
    case 'page':
      return wrap(
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>,
      )
  }
}
