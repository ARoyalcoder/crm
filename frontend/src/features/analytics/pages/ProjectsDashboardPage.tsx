import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { projectsDashboardQuery } from '@/features/analytics/api'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { ProjectEconomicsCard } from '@/features/analytics/components/FinanceDetailPanels'
import {
  CostComparisonCard,
  DelayedProjectsCard,
  DeliveryTrendCard,
  MilestonesCard,
  ProjectKpis,
  ProjectStatusCard,
} from '@/features/analytics/components/ProjectPanels'
import { kpiGrid } from '@/features/analytics/lib'
import { useDateRange } from '@/lib/use-date-range'

/** Delivery: what is running, what is late, how finished projects went, and what they cost against the estimate. */
export function ProjectsDashboardPage() {
  const dateRange = useDateRange()
  const query = useQuery({ ...projectsDashboardQuery(dateRange.range), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Projects" description="Delivery, delays and cost." />
        <ErrorState title="Could not load the projects dashboard" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  return (
    <div className="grid gap-5 min-w-0 w-full">
      <div className="grid gap-4 min-w-0">
        <PageHeader title="Projects" description="What is running, what is late, how finished projects went, and cost against estimate." />
        <DashboardToolbar dateRange={dateRange} period={period} />
      </div>

      <DashboardSection title="At a glance" description="Running now; completions in the period.">
        <div className={kpiGrid(4)}>
          <ProjectKpis projects={data?.overview} period={period} loading={query.isPending} />
        </div>
      </DashboardSection>

      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><DeliveryTrendCard delivery={data?.deliveryTrend} period={period} state={state} /></div>
        <div className="min-w-0"><ProjectStatusCard projects={data?.overview} state={state} /></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><DelayedProjectsCard projects={data?.overview} state={state} /></div>
        <div className="min-w-0"><MilestonesCard rows={data?.upcomingMilestones} state={state} /></div>
      </div>

      <CostComparisonCard
        rows={data?.costComparison}
        expectedTotal={data?.expectedCostTotal}
        recordedTotal={data?.recordedCostTotal}
        state={state}
      />

      {data?.economics !== null ? <ProjectEconomicsCard economics={data?.economics} state={state} /> : null}
    </div>
  )
}
