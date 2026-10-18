import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  customerIntelligenceExplanationQuery,
  customerIntelligenceQuery,
  intelligenceKeys,
  parseScoreBreakdown,
  refreshCustomerIntelligence,
} from '../api'
import { HealthScoreGauge } from '../components/HealthScoreGauge'
import { ScoreBreakdownTable } from '../components/ScoreBreakdownTable'
import { SegmentBadge } from '../components/SegmentBadge'

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-card p-3 shadow-soft">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

export function CustomerIntelligenceDetailPage() {
  const { id: customerId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const snapshotQuery = useQuery(customerIntelligenceQuery(customerId!))
  const explanationQuery = useQuery(customerIntelligenceExplanationQuery(customerId!))

  const refreshMutation = useMutation({
    mutationFn: () => refreshCustomerIntelligence(customerId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.customer(customerId!) })
      qc.invalidateQueries({ queryKey: intelligenceKeys.explanation(customerId!) })
    },
  })

  const snap = snapshotQuery.data
  const breakdown = snap ? parseScoreBreakdown(snap.scoreBreakdown) : []

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <PageHeader
        title="Customer intelligence"
        description={`Deep-dive health analysis. Customer ID: ${customerId}`}
        action={
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {refreshMutation.isPending ? 'Refreshing…' : 'Refresh now'}
          </button>
        }
      />

      {snapshotQuery.isError ? (
        <ErrorState error={snapshotQuery.error} />
      ) : snapshotQuery.isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : snap ? (
        <div className="grid gap-4">
          {/* Score + Segment hero */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl bg-card p-4 shadow-soft">
            <HealthScoreGauge score={snap.healthScore} />
            <div className="grid gap-2">
              <div className="flex items-center gap-3">
                <SegmentBadge segment={snap.segment} />
                <span className="text-xs text-muted-foreground">
                  Computed{' '}
                  {new Date(snap.computedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Health score: 6 contributors totalling 100 points. The breakdown below shows each reason.
              </p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Key metrics">
            <MetricCard label="CLV" value={formatMoney(snap.clv)} sub="Paid invoices total" />
            <MetricCard label="Revenue" value={formatMoney(snap.totalRevenue)} sub="All non-cancelled" />
            <MetricCard
              label="Active projects"
              value={String(snap.activeProjects)}
              sub={`${snap.purchaseCount} total purchases`}
            />
            <MetricCard
              label="Open tickets"
              value={String(snap.openTickets)}
              sub={snap.overdueInvoices > 0 ? `${snap.overdueInvoices} overdue invoices` : 'No overdue invoices'}
            />
            <MetricCard
              label="AMC"
              value={snap.hasActiveAmc ? 'Active' : 'None'}
              sub={snap.hasActiveAmc ? 'Service contract active' : 'No AMC contract'}
            />
            <MetricCard
              label="Days since purchase"
              value={snap.daysSinceLastPurchase == null ? '—' : `${snap.daysSinceLastPurchase}d`}
              sub={
                snap.lastInteractionDate
                  ? `Last contact ${new Date(snap.lastInteractionDate).toLocaleDateString('en-IN')}`
                  : 'No interaction logged'
              }
            />
          </div>

          {/* Score breakdown */}
          <section className="rounded-xl bg-card p-4 shadow-soft" aria-label="Score breakdown">
            <h2 className="mb-4 text-sm font-semibold">Score breakdown</h2>
            <ScoreBreakdownTable breakdown={breakdown} />
          </section>

          {/* Explanation */}
          <section className="rounded-xl bg-card p-4 shadow-soft" aria-label="Explanation">
            {explanationQuery.isPending ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : explanationQuery.isError ? (
              <ErrorState error={explanationQuery.error} />
            ) : (
              <>
                <h2 className="mb-3 text-sm font-semibold">{explanationQuery.data.headline}</h2>
                <ul className="grid gap-2">
                  {explanationQuery.data.reasons.map((r, i) => {
                    // Determine colour from whether the reason contains "overdue", "no ", "6+", "> 50%" etc.
                    const isNegative = /overdue|no |0\//i.test(r)
                    return (
                      <li
                        key={i}
                        className={cn(
                          'flex gap-2 text-sm',
                          isNegative ? 'text-destructive ' : 'text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1 h-2 w-2 flex-shrink-0 rounded-full',
                            isNegative ? 'bg-destructive-solid' : 'bg-success',
                          )}
                        />
                        {r}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
