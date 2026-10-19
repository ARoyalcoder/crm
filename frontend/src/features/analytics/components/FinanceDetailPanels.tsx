import { Link } from 'react-router-dom'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { verticalColor } from '@/components/charts/colors'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import type { FinanceDashboard, FinanceOverview, ProjectEconomics } from '@/features/analytics/api'
import type { ChartState } from '@/features/analytics/components/chart-state'
import { compactRupees } from '@/features/analytics/lib'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatNumber, formatPercent, formatRupees } from '@/lib/format'

type Debtor = FinanceDashboard['topDebtors'][number]

const debtorColumn = dataTableColumns<Debtor>()
const debtorColumns = debtorColumn.columns([
  debtorColumn.accessor('customerName', {
    header: 'Customer',
    cell: ({ row }) =>
      row.original.customerId ? (
        <Link to={`/customers/${row.original.customerId}`} className="font-medium underline-offset-2 hover:underline">
          {row.original.customerName ?? 'Unnamed customer'}
        </Link>
      ) : (
        (row.original.customerName ?? '—')
      ),
  }),
  debtorColumn.accessor('invoices', { header: () => <span className="block text-right">Invoices</span>, cell: ({ getValue }) => <span className="block text-right tabular">{formatNumber(getValue())}</span> }),
  debtorColumn.accessor('overdue', {
    header: () => <span className="block text-right">Overdue</span>,
    cell: ({ row }) => (
      <span className="grid justify-items-end gap-0.5 tabular">
        <span className={row.original.overdue > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>{formatRupees(row.original.overdue)}</span>
        {row.original.oldestDaysOverdue != null ? <span className="text-xs text-muted-foreground">oldest {row.original.oldestDaysOverdue} days</span> : null}
      </span>
    ),
  }),
  debtorColumn.accessor('outstanding', { header: () => <span className="block text-right">Owes</span>, cell: ({ getValue }) => <span className="block text-right font-medium tabular">{formatRupees(getValue())}</span> }),
])

export function DebtorsCard({ debtors, state }: { debtors?: Debtor[]; state: ChartState }) {
  const canReceivables = useHasPermission('RECEIVABLES_VIEW')
  const ready = !state.loading && !state.error
  return (
    <ChartCard
      title="Who owes the most"
      description="Customers by what they owe today"
      empty={debtors && debtors.length === 0 ? { title: 'No customer owes anything', description: 'All issued invoices are paid.' } : false}
      drillDown={{ to: canReceivables ? '/receivables/outstanding' : '/finance/ageing', label: canReceivables ? 'View outstanding invoices' : 'View the ageing report' }}
      {...state}
    >
      {ready ? <DataTable columns={debtorColumns} data={debtors ?? []} caption="Customers with the largest outstanding amounts" density="compact" alignRight={['invoices', 'overdue', 'outstanding']} /> : null}
    </ChartCard>
  )
}

export function InvoicedByVerticalCard({ finance, state }: { finance?: FinanceOverview; state: ChartState }) {
  const rows = finance?.byVertical ?? []
  const nothing = finance !== undefined && rows.every((row) => row.amount === 0)
  return (
    <ChartCard
      title="Invoiced by service line"
      description="From the service on each invoice line"
      table={{
        caption: 'Invoiced amount by service line',
        columns: [
          { key: 'name', label: 'Service line' },
          { key: 'amount', label: 'Invoiced', align: 'right' },
        ],
        rows: rows.map((row) => ({ name: row.name, amount: formatRupees(row.amount) })),
      }}
      empty={nothing ? { title: 'Nothing invoiced in this period' } : false}
      {...state}
    >
      <BarsChart
        orientation="bars"
        data={rows.map((row) => ({ label: row.name, amount: row.amount, code: row.code }))}
        series={[{ key: 'amount', name: 'Invoiced', format: (v) => formatRupees(v) }]}
        colorBy={(datum) => verticalColor(typeof datum.code === 'string' ? datum.code : null)}
        valueFormat={compactRupees}
        tipLabels
        description="Invoiced in the period, per service line."
      />
    </ChartCard>
  )
}

export function CollectedByMethodCard({ methods, state }: { methods?: FinanceDashboard['collectedByMethod']; state: ChartState }) {
  const rows = methods ?? []
  return (
    <ChartCard
      title="How customers paid"
      description="Payments received in the period"
      table={{
        caption: 'Payments received by method',
        columns: [
          { key: 'method', label: 'Method' },
          { key: 'payments', label: 'Payments', align: 'right' },
          { key: 'amount', label: 'Amount', align: 'right' },
        ],
        rows: rows.map((row) => ({ method: row.method ?? 'Not recorded', payments: formatNumber(row.payments), amount: formatRupees(row.amount) })),
      }}
      empty={methods && rows.length === 0 ? { title: 'No payments received in this period' } : false}
      drillDown={{ to: '/payments', label: 'View payments' }}
      {...state}
    >
      <BarsChart
        orientation="bars"
        data={rows.map((row) => ({ label: row.method ?? 'Not recorded', amount: row.amount }))}
        series={[{ key: 'amount', name: 'Received', format: (v) => formatRupees(v) }]}
        valueFormat={compactRupees}
        tipLabels
        description="Received in the period, by payment method."
      />
    </ChartCard>
  )
}

const COST_PARTS = [
  { key: 'material', label: 'Material' },
  { key: 'labour', label: 'Labour' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'travel', label: 'Travel' },
  { key: 'other', label: 'Other' },
  { key: 'notItemised', label: 'Not itemised' },
] as const

/**
 * What the projects finished in the period earned and what was recorded against them. The system keeps no
 * expense ledger, so this is the costs entered on the projects themselves and says so rather than calling it profit.
 */
export function ProjectEconomicsCard({ economics, state }: { economics?: ProjectEconomics | null; state: ChartState }) {
  const parts = economics ? COST_PARTS.map((part) => ({ label: part.label, amount: economics[part.key] })) : []
  return (
    <ChartCard
      title="What finished projects earned and cost"
      description={economics ? `${formatNumber(economics.projects)} projects finished in the period` : undefined}
      table={{
        caption: 'Revenue, cost and margin of projects finished in the period, by service line',
        columns: [
          { key: 'name', label: 'Service line' },
          { key: 'projects', label: 'Projects', align: 'right' },
          { key: 'revenue', label: 'Revenue', align: 'right' },
          { key: 'cost', label: 'Recorded cost', align: 'right' },
          { key: 'margin', label: 'Margin', align: 'right' },
        ],
        rows: (economics?.byVertical ?? []).map((row) => ({
          name: row.name,
          projects: formatNumber(row.projects),
          revenue: formatRupees(row.revenue),
          cost: formatRupees(row.recordedCost),
          margin: formatPercent(row.marginPct),
        })),
      }}
      empty={economics && economics.projects === 0 ? { title: 'No projects finished in this period', description: 'Revenue and cost appear once a project is completed.' } : false}
      {...state}
    >
      {economics ? (
        <div className="grid gap-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Figure label="Revenue" value={formatRupees(economics.revenue, { compact: true })} />
            <Figure label="Recorded cost" value={formatRupees(economics.recordedCost, { compact: true })} />
            <Figure label="Margin" value={formatRupees(economics.margin, { compact: true })} />
            <Figure label="Margin %" value={economics.marginPct === null ? '—' : formatPercent(economics.marginPct)} />
          </dl>
          <BarsChart
            orientation="bars"
            data={parts.map((part) => ({ label: part.label, amount: part.amount }))}
            series={[{ key: 'amount', name: 'Recorded cost', format: (v) => formatRupees(v) }]}
            valueFormat={compactRupees}
            tipLabels
            description="Recorded cost of finished projects by category: material, labour, vendors, travel, other, not itemised."
          />
        </div>
      ) : null}
    </ChartCard>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular">{value}</dd>
    </div>
  )
}
