import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarClock, Percent } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { financeDashboardQuery } from '@/features/analytics/api'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { kpiGrid } from '@/features/analytics/lib'
import { CollectedByMethodCard, DebtorsCard, InvoicedByVerticalCard, ProjectEconomicsCard } from '@/features/analytics/components/FinanceDetailPanels'
import { AgeingCard, FinanceKpis, RevenueTrendCard } from '@/features/analytics/components/FinancePanels'
import { formatNumber, formatPercent } from '@/lib/format'
import { useDateRange } from '@/lib/use-date-range'

/** Money in and money owed: what was invoiced and collected, who owes it, for how long, and what finished projects earned. */
export function FinanceDashboardPage() {
  const dateRange = useDateRange()
  const query = useQuery({ ...financeDashboardQuery(dateRange.range), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Finance" description="Invoiced, collected and owed." />
        <ErrorState title="Could not load the finance dashboard" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4">
        <PageHeader title="Finance" description="Invoiced and collected, who owes money, and for how long." />
        <DashboardToolbar dateRange={dateRange} period={period} />
      </div>

      <DashboardSection title="At a glance" description="Invoiced and collected in the period; owed as of today.">
        <div className={kpiGrid(6)}>
          <FinanceKpis finance={data?.overview} period={period} loading={query.isPending} />
          <StatCard
            label="Collected vs invoiced"
            icon={Percent}
            tone="primary"
            loading={query.isPending}
            value={formatPercent(data?.overview.collectionRatePct)}
            hint={data && data.overview.collectionRatePct === null ? 'Nothing invoiced in this period' : 'Above 100% means earlier invoices were paid this period'}
          />
          <StatCard
            label="Days of sales outstanding"
            icon={CalendarClock}
            tone="warning"
            loading={query.isPending}
            value={data?.dsoDays == null ? '—' : `${formatNumber(data.dsoDays)} days`}
            hint={data && data.dsoDays === null ? 'Nothing invoiced in this period' : 'What is owed, in days of the period’s invoicing'}
          />
        </div>
      </DashboardSection>

      <div className="grid gap-3 xl:grid-cols-3 min-w-0">
        <div className="min-w-0 xl:col-span-2">
          <RevenueTrendCard finance={data?.overview} period={period} state={state} />
        </div>
        <div className="min-w-0">
          <AgeingCard finance={data?.overview} state={state} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><DebtorsCard debtors={data?.topDebtors} state={state} /></div>
        <div className="min-w-0"><InvoicedByVerticalCard finance={data?.overview} state={state} /></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><CollectedByMethodCard methods={data?.collectedByMethod} state={state} /></div>
        <div className="min-w-0"><ProjectEconomicsCard economics={data?.projectEconomics} state={state} /></div>
      </div>
    </div>
  )
}
