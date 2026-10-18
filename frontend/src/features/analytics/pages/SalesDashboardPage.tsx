import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FileCheck2, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/charts/ChartCard'
import { TrendChart } from '@/components/charts/TrendChart'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { salesDashboardQuery } from '@/features/analytics/api'
import type { SalesDashboard } from '@/features/analytics/api'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { LeadFunnelCard, PipelineByStageCard, SalesKpis, WonByVerticalCard } from '@/features/analytics/components/SalesPanels'
import { bucketTick, bucketTitle, compactRupees, kpiGrid } from '@/features/analytics/lib'
import { formatNumber, formatRupees } from '@/lib/format'
import { useDateRange } from '@/lib/use-date-range'

type SalesPerson = NonNullable<SalesDashboard['orders']>['topSalespeople'][number]

const personColumn = dataTableColumns<SalesPerson>()
const personColumns = personColumn.columns([
  personColumn.accessor('name', { header: 'Salesperson', cell: ({ getValue }) => <span className="font-medium">{getValue() ?? 'Unassigned'}</span> }),
  personColumn.accessor('orders', { header: () => <span className="block text-right">Orders</span>, cell: ({ getValue }) => <span className="block text-right tabular">{formatNumber(getValue())}</span> }),
  personColumn.accessor('orderValue', { header: () => <span className="block text-right">Order value</span>, cell: ({ getValue }) => <span className="block text-right tabular">{formatRupees(getValue())}</span> }),
  personColumn.accessor('wonDeals', { header: () => <span className="block text-right">Deals won</span>, cell: ({ getValue }) => <span className="block text-right tabular">{formatNumber(getValue())}</span> }),
])

/** Leads, deals, quotations and orders: how the sales effort is converting into business. */
export function SalesDashboardPage() {
  const dateRange = useDateRange()
  const query = useQuery({ ...salesDashboardQuery(dateRange.range), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period
  const granularity = period?.granularity ?? 'DAY'
  const ready = !state.loading && !state.error

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Sales" description="Leads, deals, quotations and orders." />
        <ErrorState title="Could not load the sales dashboard" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const orders = data?.orders
  const quotations = data?.quotations

  return (
    <div className="grid gap-5 min-w-0 w-full">
      <div className="grid gap-4 min-w-0">
        <PageHeader title="Sales" description="How leads become deals, and deals become orders." />
        <DashboardToolbar dateRange={dateRange} period={period} />
      </div>

      <DashboardSection title="At a glance" description="Leads and deals closed in the period; pipeline as of today.">
        <div className={kpiGrid((data?.overview.pipeline === null ? 0 : 2) + (data?.overview.leadsCreated === null ? 0 : 2) + (orders === null ? 0 : 1) + (quotations === null ? 0 : 1))}>
          <SalesKpis sales={data?.overview} period={period} loading={query.isPending} />
          {orders !== null ? (
            <StatCard
              label="Orders"
              icon={ShoppingBag}
              tone="info"
              loading={query.isPending}
              value={formatNumber(orders?.count)}
              hint={orders ? (orders.averageValue != null ? `${formatRupees(orders.value, { compact: true })} in all, ${formatRupees(orders.averageValue, { compact: true })} on average` : 'No orders created in this period') : undefined}
              href="/orders"
            />
          ) : null}
          {quotations !== null ? (
            <StatCard
              label="Quotations accepted"
              icon={FileCheck2}
              tone="success"
              loading={query.isPending}
              value={formatNumber(quotations?.accepted)}
              hint={quotations ? `${formatRupees(quotations.acceptedValue, { compact: true })} accepted; ${formatNumber(quotations.pendingApproval)} waiting for approval` : undefined}
              href="/quotations"
            />
          ) : null}
        </div>
      </DashboardSection>

      <div className="grid gap-3 lg:grid-cols-2 min-w-0">
        {data?.overview.leadFunnel !== null ? <div className="min-w-0"><LeadFunnelCard sales={data?.overview} state={state} /></div> : null}
        {data?.overview.pipelineByStage !== null ? <div className="min-w-0"><PipelineByStageCard sales={data?.overview} state={state} /></div> : null}
      </div>

      {data?.wonByVertical !== null || orders !== null ? (
        <div className="grid gap-3 lg:grid-cols-2 min-w-0">
          {data?.wonByVertical !== null ? <div className="min-w-0"><WonByVerticalCard rows={data?.wonByVertical} state={state} /></div> : null}
          {orders !== null ? (
            <div className="min-w-0">
              <ChartCard
                title="Orders created"
                description="Orders per period, excluding cancelled"
              table={{
                caption: 'Orders created and their value',
                columns: [
                  { key: 'bucket', label: granularity === 'MONTH' ? 'Month' : granularity === 'WEEK' ? 'Week of' : 'Day' },
                  { key: 'orders', label: 'Orders', align: 'right' },
                  { key: 'value', label: 'Value', align: 'right' },
                ],
                rows: (orders?.trend ?? []).filter((p) => p.orders > 0).map((p) => ({ bucket: bucketTitle(granularity, p.bucket), orders: formatNumber(p.orders), value: formatRupees(p.value) })),
              }}
              empty={orders && orders.count === 0 ? { title: 'No orders created in this period' } : false}
              drillDown={{ to: '/orders', label: 'View orders' }}
              {...state}
            >
              <TrendChart
                data={(orders?.trend ?? []).map((p) => ({ bucket: p.bucket, value: p.value }))}
                xKey="bucket"
                xFormat={(value) => bucketTick(granularity, value)}
                tooltipTitle={(value) => bucketTitle(granularity, value)}
                yFormat={compactRupees}
                series={[{ key: 'value', name: 'Order value', kind: 'bar', format: (v) => formatRupees(v) }]}
                description="Order value per part of the period."
              />
              </ChartCard>
            </div>
          ) : null}
        </div>
      ) : null}

      {orders ? (
        <ChartCard
          title="Who is selling"
          description="Orders created and deals won, by salesperson"
          empty={orders.topSalespeople.length === 0 ? { title: 'No orders or wins in this period' } : false}
          footer="Ranked by order value."
          {...state}
        >
          {ready ? <DataTable columns={personColumns} data={orders.topSalespeople} caption="Salespeople ranked by order value" density="compact" alignRight={['orders', 'orderValue', 'wonDeals']} /> : null}
        </ChartCard>
      ) : null}

      {quotations ? (
        <p className="text-sm text-muted-foreground">
          Quotations: {formatNumber(quotations.created)} created in the period, {formatNumber(quotations.open)} out with customers right now.{' '}
          <Link to="/quotations" className="font-medium text-primary hover:underline">
            View quotations
          </Link>
        </p>
      ) : null}
    </div>
  )
}
