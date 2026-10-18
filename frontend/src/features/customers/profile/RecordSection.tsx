import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import type { Page } from '@/lib/api/page'
import { formatNumber } from '@/lib/format'

type RecordSectionProps<T extends { id: string }> = {
  title: string
  /** The permission that lets the person see this kind of record. Without it the section says so instead of showing nothing. */
  permission: string
  /** What the records are, for the "you may not see" and empty messages: "quotations". */
  noun: string
  query: UseQueryResult<Page<T>>
  /** One record as a list row. */
  row: (item: T) => ReactNode
  /** Where the full list of this kind of record is, filtered to the customer when it can be. */
  seeAll?: { to: string; label: string }
  /** What to say when the customer has none. */
  empty: string
  /** An action beside the title, e.g. "New quotation". */
  action?: ReactNode
}

/** One kind of record linked to a customer: the latest few, how many there are, and where to see them all. */
export function RecordSection<T extends { id: string }>({ title, permission, noun, query, row, seeAll, empty, action }: RecordSectionProps<T>) {
  const allowed = useHasPermission(permission)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title}
          {allowed && query.data ? <span className="ml-2 text-sm font-normal text-muted-foreground tabular">{formatNumber(query.data.totalItems)}</span> : null}
        </CardTitle>
        {allowed && (seeAll || action) ? (
          <CardAction>
            {action}
            {seeAll && query.data && query.data.totalItems > 0 ? (
              <Link to={seeAll.to} className="text-sm font-medium text-primary hover:underline">
                {seeAll.label}
              </Link>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {!allowed ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            Your role cannot see {noun}.
          </p>
        ) : query.isPending ? (
          <SkeletonLoader variant="list" count={3} label={`Loading ${noun}`} />
        ) : query.isError ? (
          <ErrorState title={`Could not load ${noun}`} error={query.error} onRetry={() => void query.refetch()} variant="compact" />
        ) : query.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {query.data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                {row(item)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
