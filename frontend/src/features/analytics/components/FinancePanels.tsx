import { Banknote, Hourglass, ReceiptText, TriangleAlert } from 'lucide-react'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { ordinalColors, seriesColor } from '@/components/charts/colors'
import { TrendChart } from '@/components/charts/TrendChart'
import { StatCard } from '@/components/shared/StatCard'
import type { FinanceOverview, Period } from '@/features/analytics/api'
import type { ChartState } from '@/features/analytics/components/chart-state'
import { bucketTick, bucketTitle, compactRupees, periodLabel, trendOf } from '@/features/analytics/lib'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatNumber, formatRupees } from '@/lib/format'

type Panel = { finance?: FinanceOverview; period?: Period; state: ChartState }

/** The four figures every money conversation starts with: invoiced, collected, owed, and owed past its date. */
export function FinanceKpis({ finance, period, loading }: { finance?: FinanceOverview; period?: Period; loading?: boolean }) {
  const canReceivables = useHasPermission('RECEIVABLES_VIEW')
  return (
    <>
      <StatCard
        label="Invoiced"
        icon={ReceiptText}
        loading={loading}
        value={formatRupees(finance?.invoiced.value, { compact: true })}
        trend={trendOf(finance?.invoiced, period)}
        hint="Invoices issued in the period"
        href="/invoices"
      />
      <StatCard
        label="Collected"
        icon={Banknote}
        tone="success"
        loading={loading}
        value={formatRupees(finance?.collected.value, { compact: true })}
        trend={trendOf(finance?.collected, period)}
        hint="Payments received, reversed ones left out"
        href="/payments"
      />
      <StatCard
        label="Outstanding"
        icon={Hourglass}
        tone="info"
        loading={loading}
        value={formatRupees(finance?.outstanding.amount, { compact: true })}
        hint={`${formatNumber(finance?.outstanding.invoices)} open invoices, as of today`}
        href={canReceivables ? '/receivables/outstanding' : '/finance/ageing'}
      />
      <StatCard
        label="Overdue"
        icon={TriangleAlert}
        tone={finance && finance.overdue.amount > 0 ? 'danger' : 'success'}
        loading={loading}
        value={formatRupees(finance?.overdue.amount, { compact: true })}
        hint={finance?.overdue.invoices ? `${formatNumber(finance.overdue.invoices)} invoices past their due date` : 'Nothing past its due date'}
        href={canReceivables ? '/receivables/overdue' : '/finance/ageing'}
      />
    </>
  )
}

export function RevenueTrendCard({ finance, period, state }: Panel) {
  const granularity = period?.granularity ?? 'DAY'
  const trend = finance?.trend ?? []
  const nothing = finance !== undefined && trend.every((p) => p.invoiced === 0 && p.collected === 0)
  const unit = granularity === 'MONTH' ? 'month' : granularity === 'WEEK' ? 'week' : 'day'
  return (
    <ChartCard
      title="Invoiced and collected"
      description={period ? periodLabel(period) : undefined}
      legend={[
        { key: 'invoiced', label: 'Invoiced', color: seriesColor(0) },
        { key: 'collected', label: 'Collected', color: seriesColor(1), mark: 'line' },
      ]}
      table={{
        caption: `Invoiced and collected per ${unit}`,
        columns: [
          { key: 'bucket', label: granularity === 'MONTH' ? 'Month' : granularity === 'WEEK' ? 'Week of' : 'Day' },
          { key: 'invoiced', label: 'Invoiced', align: 'right' },
          { key: 'collected', label: 'Collected', align: 'right' },
        ],
        rows: trend.map((p) => ({ bucket: bucketTitle(granularity, p.bucket), invoiced: formatRupees(p.invoiced), collected: formatRupees(p.collected) })),
      }}
      empty={nothing ? { title: 'No invoices or payments in this period', description: 'Issue an invoice or record a payment to see it here.' } : false}
      drillDown={{ to: '/invoices', label: 'View invoices' }}
      footer="Invoiced: invoices issued in the period, cancelled ones left out. Collected: payments received, reversed ones left out."
      {...state}
    >
      <TrendChart
        data={trend.map((p) => ({ bucket: p.bucket, invoiced: p.invoiced, collected: p.collected }))}
        xKey="bucket"
        xFormat={(value) => bucketTick(granularity, value)}
        tooltipTitle={(value) => bucketTitle(granularity, value)}
        yFormat={compactRupees}
        series={[
          { key: 'invoiced', name: 'Invoiced', kind: 'bar', format: (v) => formatRupees(v) },
          { key: 'collected', name: 'Collected', kind: 'line', format: (v) => formatRupees(v) },
        ]}
        description={`Rupees invoiced (bars) and collected (line) per ${unit}, ${period ? periodLabel(period) : ''}.`}
      />
    </ChartCard>
  )
}

/** Short axis text for an ageing band, from its stable key: "Not due", "1–30", "31–60", "61–90", "90+" (days past due). */
function ageingTick(band: { key: string; label: string }): string {
  if (band.key === 'NOT_DUE') return 'Not due'
  const range = /^D([0-9]+)_([0-9]+)$/.exec(band.key)
  if (range) return `${range[1]}–${range[2]}`
  const open = /^D([0-9]+)_PLUS$/.exec(band.key)
  if (open) return `${Number(open[1]) - 1}+`
  return band.label
}

export function AgeingCard({ finance, state }: Omit<Panel, 'period'>) {
  const canReceivables = useHasPermission('RECEIVABLES_VIEW')
  const ageing = finance?.ageing ?? []
  const colors = ordinalColors(ageing.length)
  const total = finance?.outstanding.amount ?? 0
  return (
    <ChartCard
      title="What is owed, and for how long"
      description={finance ? `${formatRupees(total)} outstanding, ${formatRupees(finance.overdue.amount)} of it overdue` : undefined}
      table={{
        caption: 'Outstanding receivables by age past due',
        columns: [
          { key: 'band', label: 'Past due' },
          { key: 'invoices', label: 'Invoices', align: 'right' },
          { key: 'amount', label: 'Amount', align: 'right' },
        ],
        rows: ageing.map((band) => ({ band: band.label, invoices: formatNumber(band.invoices), amount: formatRupees(band.amount) })),
      }}
      empty={finance && total === 0 ? { title: 'Nothing is owed', description: 'All issued invoices are paid.' } : false}
      drillDown={{ to: canReceivables ? '/receivables/outstanding' : '/finance/ageing', label: canReceivables ? 'View outstanding invoices' : 'View the ageing report' }}
      footer="Bars show days past due, as of today. Outstanding is the invoice total after payments, credit notes and debit notes."
      {...state}
    >
      <BarsChart
        data={ageing.map((band) => ({ label: ageingTick(band), amount: band.amount, invoices: band.invoices }))}
        series={[{ key: 'amount', name: 'Outstanding', format: (v) => formatRupees(v) }]}
        colorBy={(_, index) => colors[index] ?? seriesColor(0)}
        valueFormat={compactRupees}
        tipLabels
        height={190}
        description="Outstanding amount by days past due, from not yet due to over 90 days."
      />
    </ChartCard>
  )
}
