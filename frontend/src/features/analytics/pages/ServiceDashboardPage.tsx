import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { serviceDashboardQuery } from '@/features/analytics/api'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { kpiGrid } from '@/features/analytics/lib'
import { AmcRenewalsCard, OpenByPriorityCard, ServiceKpis, TicketVolumeCard } from '@/features/analytics/components/ServicePanels'
import { formatNumber } from '@/lib/format'
import { useDateRange } from '@/lib/use-date-range'

/** The support desk and the contracts: ticket volume and SLA, who is carrying the load, and what renews soon. */
export function ServiceDashboardPage() {
  const dateRange = useDateRange()
  const query = useQuery({ ...serviceDashboardQuery(dateRange.range), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Service" description="Tickets, SLA and contracts." />
        <ErrorState title="Could not load the service dashboard" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const overview = data?.overview
  const seesTickets = overview === undefined || overview.openTickets !== null
  const seesContracts = overview === undefined || overview.amc !== null

  return (
    <div className="grid gap-5 min-w-0 w-full">
      <div className="grid gap-4 min-w-0">
        <PageHeader title="Service" description="Support desk performance, and contracts and warranties due for renewal." />
        <DashboardToolbar dateRange={dateRange} period={period} />
      </div>

      <DashboardSection title="At a glance" description="Tickets opened and resolved in the period; open tickets and contracts as of today.">
        <div className={kpiGrid((seesTickets ? 4 : 0) + (seesContracts ? 1 : 0) + (seesContracts && data?.warrantiesExpiring90 != null ? 1 : 0))}>
          <ServiceKpis service={overview} period={period} loading={query.isPending} />
          {seesContracts && data?.warrantiesExpiring90 != null ? (
            <StatCard
              label="Warranties ending in 90 days"
              icon={ShieldAlert}
              tone={data.warrantiesExpiring90 > 0 ? 'warning' : 'success'}
              value={formatNumber(data.warrantiesExpiring90)}
              hint="Active warranties ending within 3 months"
              href="/warranties"
            />
          ) : null}
        </div>
      </DashboardSection>

      {seesTickets ? (
        <div className="grid gap-4 lg:grid-cols-3 min-w-0">
          <div className="min-w-0 lg:col-span-2">
            <TicketVolumeCard service={overview} period={period} state={state} />
          </div>
          <div className="min-w-0">
            <OpenByPriorityCard rows={data?.openByPriority} state={state} />
          </div>
        </div>
      ) : null}

      {seesTickets && data?.agentLoad && data.agentLoad.length > 0 ? (
        <DashboardSection title="Who is carrying the desk" description="Open tickets by assignee">
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 min-w-0">
            {data.agentLoad.map((agent) => (
              <li key={agent.userId ?? 'unassigned'} className="grid gap-0.5 rounded-xl border bg-card px-4 py-3 shadow-soft min-w-0">
                <span className="truncate font-medium" title={agent.name}>
                  {agent.name}
                </span>
                <span className="text-sm text-muted-foreground tabular">
                  {formatNumber(agent.open)} open
                  {agent.breached > 0 ? <span className="font-medium text-destructive">, {formatNumber(agent.breached)} past their due time</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      ) : null}

      {seesContracts ? <AmcRenewalsCard service={overview} state={state} /> : null}
    </div>
  )
}
