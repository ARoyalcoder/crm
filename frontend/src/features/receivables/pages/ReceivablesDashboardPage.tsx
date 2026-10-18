import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardQuery, type AgeingBucket, type ReceivablesDashboard } from '@/features/receivables/api'
import { formatMoney } from '@/features/finance/api'
import { cn } from '@/lib/utils'

const BUCKET_COLORS: Record<string, string> = {
  '0–30 days': 'border-success/30 bg-success-soft text-success',
  '31–60 days': 'border-warning/30 bg-warning-soft text-warning',
  '61–90 days': 'border-warning/30 bg-warning-soft text-warning',
  'Over 90 days': 'border-destructive/30 bg-destructive-soft text-destructive',
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'red' | 'amber' | 'blue' | 'green'
}) {
  const toneClasses: Record<'red' | 'amber' | 'blue' | 'green', string> = {
    red: 'text-destructive',
    amber: 'text-warning',
    blue: 'text-info',
    green: 'text-success',
  }
  const valueClass = tone ? toneClasses[tone] : ''

  return (
    <div className="grid gap-1 rounded-xl bg-card p-3 shadow-soft">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-xl font-semibold tabular-nums', valueClass)}>{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}

function BucketTile({ bucket }: { bucket: AgeingBucket }) {
  const style = BUCKET_COLORS[bucket.label] ?? 'border-border bg-muted/50 text-muted-foreground'
  return (
    <div className={cn('grid gap-1 rounded-2xl border p-4', style)}>
      <span className="text-xs font-medium">{bucket.label}</span>
      <span className="text-lg font-semibold tabular-nums">{formatMoney(bucket.amount)}</span>
      <span className="text-xs opacity-75">
        {bucket.count} {bucket.count === 1 ? 'invoice' : 'invoices'}
      </span>
    </div>
  )
}

function DashboardContent({ data }: { data: ReceivablesDashboard }) {
  return (
    <div className="grid gap-4">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Key figures">
        <KpiCard label="Total receivable" value={formatMoney(data.totalReceivable)} hint="Outstanding across all open invoices" />
        <KpiCard label="Overdue" value={formatMoney(data.overdue)} hint="Past due date" tone="red" />
        <KpiCard label="Due today" value={formatMoney(data.dueToday)} hint="Invoices due today" tone="amber" />
        <KpiCard label="Due this week" value={formatMoney(data.dueThisWeek)} hint="Next 7 days" tone="blue" />
        <KpiCard
          label="Collection rate"
          value={`${data.collectionRate.toFixed(1)}%`}
          hint="Collected vs billed this month"
          tone="green"
        />
      </div>

      {/* Ageing buckets */}
      {data.ageingBuckets.length > 0 ? (
        <section aria-label="Ageing buckets">
          <h2 className="mb-3 text-sm font-semibold">Overdue by age</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.ageingBuckets.map((bucket) => (
              <BucketTile key={bucket.label} bucket={bucket} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-xl bg-card p-4 text-center text-sm text-muted-foreground shadow-soft">
          No overdue invoices. Well done!
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/receivables/outstanding" className="text-primary underline-offset-2 hover:underline">
          View outstanding invoices →
        </Link>
        <Link to="/receivables/overdue" className="text-primary underline-offset-2 hover:underline">
          View overdue invoices →
        </Link>
        <Link to="/receivables/collection-tasks" className="text-primary underline-offset-2 hover:underline">
          Collection tasks →
        </Link>
      </div>
    </div>
  )
}

/** Receivables dashboard (`/receivables`): KPIs and ageing buckets. */
export function ReceivablesDashboardPage() {
  const dashboard = useQuery(dashboardQuery)

  return (
    <div className="grid gap-4">
      <PageHeader title="Receivables" description="Outstanding amounts, overdue invoices and collection performance." />
      {dashboard.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading the receivables dashboard" />
      ) : dashboard.isError ? (
        <ErrorState
          title="Could not load the receivables dashboard"
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <DashboardContent data={dashboard.data} />
      )}
    </div>
  )
}
