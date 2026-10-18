import { CalendarClock, CircleCheck, Headphones, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { seriesColor, statusColor } from '@/components/charts/colors'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { TrendChart } from '@/components/charts/TrendChart'
import type { AmcRenewal, Period, ServiceOverview } from '@/features/analytics/api'
import type { ChartState } from '@/features/analytics/components/chart-state'
import { bucketTick, bucketTitle, periodLabel, trendOf } from '@/features/analytics/lib'
import { formatDate, formatNumber, formatPercent, formatRupees } from '@/lib/format'

type Panel = { service?: ServiceOverview; period?: Period; state: ChartState }

/** Ticket figures when the caller may see tickets, contract figures when they may see AMCs; each half only if the server sent it. */
export function ServiceKpis({ service, period, loading }: { service?: ServiceOverview; period?: Period; loading?: boolean }) {
  const tickets = service === undefined || service.openTickets !== null
  const contracts = service === undefined || service.amc !== null
  return (
    <>
      {tickets ? (
        <>
          <StatCard
            label="Open tickets"
            icon={Headphones}
            loading={loading}
            value={formatNumber(service?.openTickets)}
            hint={service?.opened ? `${formatNumber(service.opened.value)} opened in the period` : undefined}
            trend={trendOf(service?.opened, period, 'down')}
            href="/support/tickets"
          />
          <StatCard
            label="Past their SLA time"
            icon={TriangleAlert}
            tone={service && (service.breachedOpen ?? 0) > 0 ? 'danger' : 'success'}
            loading={loading}
            value={formatNumber(service?.breachedOpen)}
            hint={service && (service.breachedOpen ?? 0) > 0 ? 'Open tickets past due' : 'No open tickets past due'}
            href="/support/tickets"
          />
          <StatCard
            label="Resolved"
            icon={CircleCheck}
            tone="success"
            loading={loading}
            value={formatNumber(service?.resolved?.value)}
            trend={trendOf(service?.resolved, period)}
            hint={service?.avgResolutionHours != null ? `Average ${formatNumber(service.avgResolutionHours)} hours to resolve` : undefined}
            href="/support/tickets"
          />
          <StatCard
            label="Resolved within SLA"
            icon={ShieldCheck}
            tone="info"
            loading={loading}
            value={formatPercent(service?.slaCompliancePct, 0)}
            hint={service && service.slaCompliancePct === null ? 'No tickets with a due time resolved' : 'Of tickets resolved in the period with a due time'}
          />
        </>
      ) : null}
      {contracts ? (
        <StatCard
          label="AMCs renewing in 30 days"
          icon={CalendarClock}
          tone={service?.amc && service.amc.expiring30 > 0 ? 'warning' : 'success'}
          loading={loading}
          value={formatNumber(service?.amc?.expiring30)}
          hint={service?.amc ? `${formatNumber(service.amc.active)} contracts in force` : undefined}
          href="/amc-contracts"
        />
      ) : null}
    </>
  )
}

export function TicketVolumeCard({ service, period, state }: Panel) {
  const granularity = period?.granularity ?? 'DAY'
  const volume = service?.volume ?? []
  const nothing = service?.volume != null && volume.every((p) => p.opened === 0 && p.resolved === 0)
  const unit = granularity === 'MONTH' ? 'month' : granularity === 'WEEK' ? 'week' : 'day'
  return (
    <ChartCard
      title="Ticket volume"
      description={period ? periodLabel(period) : undefined}
      legend={[
        { key: 'opened', label: 'Opened', color: seriesColor(0) },
        { key: 'resolved', label: 'Resolved', color: seriesColor(1), mark: 'line' },
      ]}
      table={{
        caption: `Tickets opened and resolved per ${unit}`,
        columns: [
          { key: 'bucket', label: granularity === 'MONTH' ? 'Month' : granularity === 'WEEK' ? 'Week of' : 'Day' },
          { key: 'opened', label: 'Opened', align: 'right' },
          { key: 'resolved', label: 'Resolved', align: 'right' },
        ],
        rows: volume.map((p) => ({ bucket: bucketTitle(granularity, p.bucket), opened: formatNumber(p.opened), resolved: formatNumber(p.resolved) })),
      }}
      empty={nothing ? { title: 'No tickets opened or resolved in this period' } : false}
      drillDown={{ to: '/support/tickets', label: 'View tickets' }}
      {...state}
    >
      <TrendChart
        data={volume.map((p) => ({ bucket: p.bucket, opened: p.opened, resolved: p.resolved }))}
        xKey="bucket"
        xFormat={(value) => bucketTick(granularity, value)}
        tooltipTitle={(value) => bucketTitle(granularity, value)}
        series={[
          { key: 'opened', name: 'Opened', kind: 'bar' },
          { key: 'resolved', name: 'Resolved', kind: 'line' },
        ]}
        description={`Tickets opened (bars) and resolved (line) per ${unit}.`}
      />
    </ChartCard>
  )
}

export function OpenByPriorityCard({
  rows,
  state,
}: {
  rows?: { priority: string; open: number; breached: number }[] | null
  state: ChartState
}) {
  const data = rows ?? []
  return (
    <ChartCard
      title="Open tickets by priority"
      description="Open now, and past their due time"
      legend={[
        { key: 'ok', label: 'Within time', color: seriesColor(0) },
        { key: 'breached', label: 'Past due time', color: statusColor.serious },
      ]}
      table={{
        caption: 'Open tickets by priority, and how many are past due',
        columns: [
          { key: 'priority', label: 'Priority' },
          { key: 'open', label: 'Open', align: 'right' },
          { key: 'breached', label: 'Past due time', align: 'right' },
        ],
        rows: data.map((r) => ({ priority: <StatusBadge status={r.priority} domain="priority" />, open: formatNumber(r.open), breached: formatNumber(r.breached) })),
      }}
      empty={rows && data.length === 0 ? { title: 'No open tickets', description: 'Every ticket is resolved or closed.' } : false}
      drillDown={{ to: '/support/tickets', label: 'View open tickets' }}
      {...state}
    >
      <BarsChart
        orientation="bars"
        stacked
        data={data.map((r) => ({ label: r.priority.charAt(0) + r.priority.slice(1).toLowerCase(), ok: r.open - r.breached, breached: r.breached }))}
        series={[
          { key: 'ok', name: 'Within time', color: seriesColor(0) },
          { key: 'breached', name: 'Past due time', color: statusColor.serious },
        ]}
        description="Open tickets by priority, split into within due time and past due."
      />
    </ChartCard>
  )
}

const renewalColumn = dataTableColumns<AmcRenewal>()
const renewalColumns = renewalColumn.columns([
  renewalColumn.accessor('number', {
    header: 'Contract',
    cell: ({ row }) => (
      <Link to={`/amc-contracts/${row.original.id}`} className="grid min-w-0 gap-0.5 underline-offset-2 hover:underline">
        <span className="font-mono text-sm font-medium">{row.original.number}</span>
        <span className="truncate text-xs text-muted-foreground">{row.original.customer ?? 'No customer'}</span>
      </Link>
    ),
  }),
  renewalColumn.accessor('endDate', {
    header: 'Ends',
    cell: ({ row }) => (
      <span className="grid gap-0.5">
        <span className="whitespace-nowrap">{formatDate(row.original.endDate)}</span>
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {row.original.daysLeft === 0 ? 'Today' : `In ${row.original.daysLeft} ${row.original.daysLeft === 1 ? 'day' : 'days'}`}
        </span>
      </span>
    ),
  }),
  renewalColumn.accessor('value', { header: () => <span className="block text-right">Value</span>, cell: ({ getValue }) => <span className="block text-right tabular">{formatRupees(getValue())}</span> }),
  renewalColumn.accessor('renewalStatus', {
    header: 'Renewal',
    cell: ({ getValue }) => (getValue() ? <StatusBadge status={getValue()} domain="renewal" /> : <span className="text-muted-foreground">Not started</span>),
  }),
])

export function AmcRenewalsCard({ service, state }: Omit<Panel, 'period'>) {
  const amc = service?.amc
  const ready = !state.loading && !state.error
  return (
    <ChartCard
      title="AMC renewals"
      description={amc ? `${formatNumber(amc.expiring90)} contracts worth ${formatRupees(amc.expiring90Value)} end in the next 90 days` : undefined}
      empty={amc && amc.upcoming.length === 0 ? { title: 'No contract ends in the next 90 days', description: `${formatNumber(amc.active)} contracts are in force.` } : false}
      drillDown={{ to: '/amc-contracts', label: 'View AMC contracts' }}
      footer={amc ? `In this period ${formatNumber(amc.renewedInPeriod)} renewed and ${formatNumber(amc.lapsedInPeriod)} lapsed.` : undefined}
      {...state}
    >
      {ready && amc ? <DataTable columns={renewalColumns} data={amc.upcoming} caption="AMC contracts ending in the next 90 days" density="compact" /> : null}
    </ChartCard>
  )
}
