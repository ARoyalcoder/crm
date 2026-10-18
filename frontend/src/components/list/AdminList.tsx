import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { RowData } from '@tanstack/react-table'
import { SearchX } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Pagination } from '@/components/list/ListControls'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import type { Page } from '@/lib/api/page'
import { cn } from '@/lib/utils'

type AdminListProps<TData extends RowData> = {
  /** Search box and filters (a `FilterBar`). */
  toolbar: ReactNode
  query: UseQueryResult<Page<TData>>
  columns: DataTableColumn<TData>[]
  /** What the rows are, plural and lower-case: "services". Used for the caption, counts and messages. */
  noun: string
  /** One of them: "service". */
  singular: string
  onPageChange: (page: number) => void
  /** A problem with a row action (activate, delete), shown above the table. */
  actionError?: unknown
  /** Columns holding numbers or amounts. */
  alignRight?: string[]
  /** Server-side sort: see `DataTable`. */
  sort?: { value: string; onChange: (value: string) => void; keys: Record<string, string> }
  onRowClick?: (row: TData) => void
  /** Shown when there are no rows at all (as opposed to none matching the filters). */
  emptyAction?: ReactNode
  /** True when a search or filter is applied, so the empty state can say "nothing matches" rather than "nothing yet". */
  filtered?: boolean
}

/** The standard paged, filterable list: toolbar, loading and error states, table, pagination. */
export function AdminList<TData extends RowData>({
  toolbar,
  query,
  columns,
  noun,
  singular,
  onPageChange,
  actionError,
  alignRight,
  sort,
  onRowClick,
  emptyAction,
  filtered,
}: AdminListProps<TData>) {
  const hasRows = query.data ? query.data.items.length > 0 : false
  return (
    <Card>
      <CardContent className="grid gap-4">
        {toolbar}
        {actionError ? <ErrorState title={`That change to ${noun} could not be saved`} error={actionError} /> : null}
        {query.isPending ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
            <SkeletonLoader variant="table" label={`Loading ${noun}`} />
          </motion.div>
        ) : query.isError ? (
          <ErrorState title={`Could not load ${noun}`} error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn('transition-opacity duration-200 min-w-0', query.isPlaceholderData && 'opacity-65')}
            aria-busy={query.isPlaceholderData || undefined}
          >
            <DataTable
              columns={columns}
              data={query.data.items}
              caption={noun.charAt(0).toUpperCase() + noun.slice(1)}
              alignRight={alignRight}
              sort={sort}
              onRowClick={onRowClick}
              empty={
                hasRows ? undefined : (
                  <EmptyState
                    variant="compact"
                    icon={filtered ? SearchX : undefined}
                    title={filtered ? `No ${noun} match` : `No ${noun} yet`}
                    description={filtered ? 'Try another search or clear filters.' : undefined}
                    action={filtered ? undefined : emptyAction}
                  />
                )
              }
            />
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              totalItems={query.data.totalItems}
              noun={noun}
              singular={singular}
              onPageChange={onPageChange}
            />
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
