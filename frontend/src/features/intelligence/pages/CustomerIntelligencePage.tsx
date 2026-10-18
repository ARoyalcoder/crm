import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  CUSTOMER_SEGMENTS,
  type CustomerSegmentValue,
  intelligenceCustomersQuery,
  intelligenceSummaryQuery,
} from '../api'
import { SegmentBadge } from '../components/SegmentBadge'

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

function SegmentCard({
  segment,
  count,
  active,
  onClick,
}: {
  segment: string
  count: number
  active: boolean
  onClick: () => void
}) {
  const styles: Record<string, string> = {
    HEALTHY:'border-success/30 bg-success-soft text-success',
    AT_RISK:'border-destructive/30 bg-destructive-soft text-destructive',
    INACTIVE:'border-border bg-muted/50 text-muted-foreground',
    HIGH_VALUE: 'border-primary/30 bg-accent text-accent-foreground',
    NEW:'border-info/30 bg-info-soft text-info',
  }
  const label = CUSTOMER_SEGMENTS.find((s) => s.value === segment)?.label ?? segment

  return (
    <button
      onClick={onClick}
      className={cn(
        'grid gap-1 rounded-2xl border p-4 text-left transition-shadow',
        styles[segment] ?? 'border-muted bg-muted/30',
        active && 'ring-2 ring-offset-1 ring-current',
      )}
    >
      <span className="text-xs font-medium opacity-75">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{count}</span>
      <span className="text-xs opacity-60">customers</span>
    </button>
  )
}

export function CustomerIntelligencePage() {
  const [activeSegment, setActiveSegment] = useState<CustomerSegmentValue | undefined>(undefined)
  const [page, setPage] = useState(0)

  const summaryQuery = useQuery(intelligenceSummaryQuery())
  const customersQuery = useQuery(
    intelligenceCustomersQuery({ segment: activeSegment, page }),
  )

  const handleSegmentClick = (seg: CustomerSegmentValue) => {
    setActiveSegment(activeSegment === seg ? undefined : seg)
    setPage(0)
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <PageHeader
        title="Customer intelligence"
        description="Health scores, CLV and segments for every customer, recomputed nightly."
      />

      {/* Segment summary cards */}
      {summaryQuery.isError ? (
        <ErrorState error={summaryQuery.error} />
      ) : summaryQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CUSTOMER_SEGMENTS.map((s) => (
            <Skeleton key={s.value} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Segment summary">
          {CUSTOMER_SEGMENTS.map((s) => (
            <SegmentCard
              key={s.value}
              segment={s.value}
              count={summaryQuery.data.countBySegment[s.value] ?? 0}
              active={activeSegment === s.value}
              onClick={() => handleSegmentClick(s.value)}
            />
          ))}
        </div>
      )}

      {/* Average health score */}
      {summaryQuery.data && (
        <p className="text-sm text-muted-foreground">
          Organisation average health score:{' '}
          <span className="font-semibold text-foreground">
            {summaryQuery.data.avgHealthScore.toFixed(1)}
          </span>
          {activeSegment && (
            <button
              onClick={() => { setActiveSegment(undefined); setPage(0) }}
              className="ml-3 text-xs underline underline-offset-2"
            >
              Clear filter
            </button>
          )}
        </p>
      )}

      {/* Customer table */}
      <section aria-label="Customers">
        <h2 className="mb-3 text-sm font-semibold">
          {activeSegment
            ? `${CUSTOMER_SEGMENTS.find((s) => s.value === activeSegment)?.label} customers`
            : 'All customers'}
        </h2>

        {customersQuery.isError ? (
          <ErrorState error={customersQuery.error} />
        ) : customersQuery.isPending ? (
          <div className="grid gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : customersQuery.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers match this filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Segment</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-center w-28">Health</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">CLV</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Revenue</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Days since purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {customersQuery.data.items.map((snap) => (
                    <tr key={snap.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/customers/${snap.customerId}/intelligence`}
                          className="font-medium hover:underline"
                        >
                          {snap.customerId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <SegmentBadge segment={snap.segment} />
                      </td>
                      <td className="px-4 py-3">
                        {/* Compact inline health bar */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              'text-sm font-semibold tabular-nums',
                              snap.healthScore >= 80
                                ? 'text-success '
                                : snap.healthScore >= 50
                                  ? 'text-warning '
                                  : 'text-destructive ',
                            )}
                          >
                            {snap.healthScore}
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                snap.healthScore >= 80
                                  ? 'bg-success'
                                  : snap.healthScore >= 50
                                    ? 'bg-warning'
                                    : 'bg-destructive-solid',
                              )}
                              style={{ width: `${snap.healthScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(snap.clv)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(snap.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {snap.daysSinceLastPurchase == null
                          ? '—'
                          : `${snap.daysSinceLastPurchase}d`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {customersQuery.data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Page {customersQuery.data.page + 1} of {customersQuery.data.totalPages} ·{' '}
                  {customersQuery.data.totalItems} customers
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded-lg border disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= customersQuery.data.totalPages - 1}
                    className="px-3 py-1 rounded-lg border disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
