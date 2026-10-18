import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { controlTowerQuery } from '@/features/analytics/api'
import { AttentionCard } from '@/features/analytics/components/AttentionCard'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { kpiGrid } from '@/features/analytics/lib'
import { AgeingCard, FinanceKpis, RevenueTrendCard } from '@/features/analytics/components/FinancePanels'
import { DelayedProjectsCard, ProjectKpis, ProjectStatusCard } from '@/features/analytics/components/ProjectPanels'
import { LeadFunnelCard, PipelineByStageCard, SalesKpis } from '@/features/analytics/components/SalesPanels'
import { AmcRenewalsCard, ServiceKpis, TicketVolumeCard } from '@/features/analytics/components/ServicePanels'
import { useAuth } from '@/features/auth/auth-context'
import { useDateRange } from '@/lib/use-date-range'

function greeting(now = new Date()): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * The business at a glance, for people who run it. Every part (money, sales, delivery, service) is drawn only
 * if the person may see that part of the business: the server leaves out what their permissions do not cover,
 * and this page does not ask for what it already knows it will not get.
 */
export function ControlTowerPage() {
  const { user } = useAuth()
  const dateRange = useDateRange()
  const query = useQuery({ ...controlTowerQuery(dateRange.range), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period

  const has = (permission: string) => user?.permissions.includes(permission) ?? false
  const showFinance = has('FINANCE_VIEW')
  const showSales = has('LEAD_VIEW') || has('OPPORTUNITY_VIEW')
  const showProjects = has('PROJECT_VIEW')
  const showService = has('TICKET_VIEW') || has('AMC_VIEW')
  const showPulse = has('PULSE_VIEW')
  const first = user?.fullName.split(/\s+/)[0]

  // How many stat cards each band will have, so its row is laid out evenly while the numbers are still loading.
  const salesCards = data?.sales ? (data.sales.pipeline ? 2 : 0) + (data.sales.leadsCreated ? 2 : 0) : 4
  const serviceCards = data?.service ? (data.service.openTickets !== null ? 4 : 0) + (data.service.amc ? 1 : 0) : has('TICKET_VIEW') ? (has('AMC_VIEW') ? 5 : 4) : 1

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Control tower" description="Where the business stands." />
        <ErrorState title="Could not load the control tower" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  if (!showFinance && !showSales && !showProjects && !showService) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Control tower" description="Where the business stands." />
        <EmptyState
          icon={LayoutDashboard}
          title="No business figures for your role"
          description="Money, sales, projects and service, each shown only to those who may see it. Your own tasks are on My work."
          action={
            <Button asChild>
              <Link to="/my-work">Open my work</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 min-w-0 w-full">
      <div className="grid gap-2 sm:gap-2.5 min-w-0">
        <PageHeader
          title={first ? `${greeting()}, ${first}` : `${greeting()}!`}
        />
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between min-w-0">
          <DashboardToolbar dateRange={dateRange} period={period} />
        </div>
      </div>

      {showFinance ? (
        <DashboardSection
          title="Money"
          action={
            <Link to="/analytics/finance" className="text-xs font-semibold text-primary hover:underline">
              Finance dashboard
            </Link>
          }
        >
          <div className={kpiGrid(4)}>
            <FinanceKpis finance={data?.finance ?? undefined} period={period} loading={query.isPending} />
          </div>
          <div className="grid gap-3 xl:grid-cols-3 min-w-0">
            <div className="min-w-0 xl:col-span-2">
              <RevenueTrendCard finance={data?.finance ?? undefined} period={period} state={state} />
            </div>
            <div className="min-w-0">
              <AgeingCard finance={data?.finance ?? undefined} state={state} />
            </div>
          </div>
        </DashboardSection>
      ) : null}

      {showSales ? (
        <DashboardSection
          title="Sales"
          action={
            <Link to="/analytics/sales" className="text-xs font-semibold text-primary hover:underline">
              Sales dashboard
            </Link>
          }
        >
          <div className={kpiGrid(salesCards)}>
            <SalesKpis sales={data?.sales ?? undefined} period={period} loading={query.isPending} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2 min-w-0">
            {showLeadFunnel(data?.sales) ? <div className="min-w-0"><LeadFunnelCard sales={data?.sales ?? undefined} state={state} /></div> : null}
            {showPipeline(data?.sales) ? <div className="min-w-0"><PipelineByStageCard sales={data?.sales ?? undefined} state={state} /></div> : null}
          </div>
        </DashboardSection>
      ) : null}

      {showProjects ? (
        <DashboardSection
          title="Delivery"
          action={
            <Link to="/analytics/projects" className="text-xs font-semibold text-primary hover:underline">
              Projects dashboard
            </Link>
          }
        >
          <div className={kpiGrid(4)}>
            <ProjectKpis projects={data?.projects ?? undefined} period={period} loading={query.isPending} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2 min-w-0">
            <div className="min-w-0"><ProjectStatusCard projects={data?.projects ?? undefined} state={state} /></div>
            <div className="min-w-0"><DelayedProjectsCard projects={data?.projects ?? undefined} state={state} /></div>
          </div>
        </DashboardSection>
      ) : null}

      {showService ? (
        <DashboardSection
          title="Service"
          action={
            <Link to="/analytics/service" className="text-xs font-semibold text-primary hover:underline">
              Service dashboard
            </Link>
          }
        >
          <div className={kpiGrid(serviceCards)}>
            <ServiceKpis service={data?.service ?? undefined} period={period} loading={query.isPending} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2 min-w-0">
            {data?.service?.volume !== null ? <div className="min-w-0"><TicketVolumeCard service={data?.service ?? undefined} period={period} state={state} /></div> : null}
            {data?.service?.amc !== null ? <div className="min-w-0"><AmcRenewalsCard service={data?.service ?? undefined} state={state} /></div> : null}
          </div>
        </DashboardSection>
      ) : null}

      {showPulse ? (
        <DashboardSection title="Needs attention">
          <AttentionCard />
        </DashboardSection>
      ) : null}
    </div>
  )
}

function showLeadFunnel(sales: { leadFunnel: unknown[] | null } | null | undefined): boolean {
  return sales === null || sales === undefined || sales.leadFunnel !== null
}

function showPipeline(sales: { pipelineByStage: unknown[] | null } | null | undefined): boolean {
  return sales === null || sales === undefined || sales.pipelineByStage !== null
}
