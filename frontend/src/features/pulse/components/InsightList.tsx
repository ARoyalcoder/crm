import type { ReactNode } from 'react'
import { Gauge } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Pagination } from '@/components/list/ListControls'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import type { InsightPage } from '@/features/pulse/api'
import { InsightCard } from '@/features/pulse/components/InsightCard'

type InsightListProps = {
  /** The query behind the list (its `data` is one page of insights). */
  query: {
    data?: InsightPage
    isPending: boolean
    isError: boolean
    isFetching: boolean
    error: unknown
    refetch: () => unknown
  }
  page: number
  onPageChange: (page: number) => void
  empty: { title: string; description?: ReactNode }
}

/** A page of insights with its loading, error and empty states and its pager. */
export function InsightList({ query, page, onPageChange, empty }: InsightListProps) {
  if (query.isPending) return <SkeletonLoader variant="card" height={220} label="Loading insights" />
  if (query.isError && !query.data) {
    return <ErrorState title="Could not load insights" error={query.error} onRetry={() => void query.refetch()} />
  }
  const data = query.data
  if (!data || data.items.length === 0) {
    return <EmptyState icon={Gauge} title={empty.title} description={empty.description} />
  }
  return (
    <div className="grid gap-4" aria-busy={query.isFetching || undefined}>
      <ul className="grid gap-4">
        {data.items.map((insight) => (
          <li key={insight.id}>
            <InsightCard insight={insight} />
          </li>
        ))}
      </ul>
      <Pagination page={page} totalPages={data.totalPages} totalItems={data.totalItems} noun="insights" singular="insight" onPageChange={onPageChange} />
    </div>
  )
}
