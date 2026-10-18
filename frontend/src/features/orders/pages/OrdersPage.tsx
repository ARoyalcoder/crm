import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Layers, PackageCheck, ShoppingBag, Truck, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { FilterSelect, ListToolbar, SearchInput } from '@/components/list/ListControls'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { kpiGrid } from '@/features/analytics/lib'
import { formatDate, formatNumber, formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { ORDER_STATUSES, orderDashboardQuery, ordersQuery, type OrderStatus, type OrderSummary } from '../api'
import { OrderStatusBadge } from '../components/OrderStatusBadge'

const column = dataTableColumns<OrderSummary>()

const columns = column.columns([
  column.accessor('orderNumber', {
    header: 'Order',
    cell: ({ row }) => (
      <Link to={`/orders/${row.original.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
        <span className="font-medium">{row.original.title}</span>
        <span className="font-mono text-xs text-muted-foreground">{row.original.orderNumber}</span>
      </Link>
    ),
  }),
  column.accessor('customerName', {
    header: 'Customer',
    cell: ({ row }) => (
      <Link to={`/customers/${row.original.customerId}`} className="underline-offset-2 hover:underline">
        {row.original.customerName}
      </Link>
    ),
  }),
  column.accessor('quotationNumber', {
    header: 'Quotation',
    cell: ({ row }) =>
      row.original.quotationId ? (
        <Link to={`/quotations/${row.original.quotationId}`} className="font-mono text-xs whitespace-nowrap underline-offset-2 hover:underline">
          {row.original.quotationNumber}
          {row.original.quotationVersionNumber ? ` v${row.original.quotationVersionNumber}` : ''}
        </Link>
      ) : (
        <span className="text-muted-foreground">Direct order</span>
      ),
  }),
  column.accessor('deliveryDate', { header: 'Delivery', cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span> }),
  column.accessor('status', { header: 'Status', cell: ({ getValue }) => <OrderStatusBadge status={getValue()} /> }),
  column.accessor('finalAmount', {
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => <span className="block text-right tabular">{formatRupees(row.original.finalAmount)}</span>,
  }),
  column.accessor('createdAt', { header: 'Created', cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(getValue())}</span> }),
])

/** Confirmed customer orders: how many are at each stage, and the list behind the numbers. */
export function OrdersPage() {
  const params = useListParams()
  const search = params.get('search')
  const status = params.get('status')
  const filtered = Boolean(search || status)

  const dashboard = useQuery(orderDashboardQuery())
  const orders = useQuery(ordersQuery({ search: search || undefined, status: (status || undefined) as OrderStatus | undefined, page: params.page, size: 20 }))
  const totals = dashboard.data

  const tiles = useMemo(
    () =>
      totals
        ? [
            { label: 'Orders', icon: Layers, value: totals.totalOrders, hint: `${formatRupees(totals.totalValue, { compact: true })} in total`, tone: 'neutral' as const, href: '/orders' },
            { label: 'Confirmed', icon: ShoppingBag, value: totals.confirmedCount, hint: 'Ready to start', tone: 'info' as const, href: '/orders?status=CONFIRMED' },
            { label: 'In progress', icon: Clock, value: totals.inProgressCount, hint: 'Being fulfilled', tone: 'info' as const, href: '/orders?status=IN_PROGRESS' },
            { label: 'Partly delivered', icon: Truck, value: totals.partiallyDeliveredCount, hint: 'Some items handed over', tone: 'warning' as const, href: '/orders?status=PARTIALLY_DELIVERED' },
            { label: 'Completed', icon: CheckCircle2, value: totals.completedCount, hint: 'Fully delivered', tone: 'success' as const, href: '/orders?status=COMPLETED' },
            { label: 'Cancelled', icon: XCircle, value: totals.cancelledCount, hint: 'Not going ahead', tone: 'neutral' as const, href: '/orders?status=CANCELLED' },
          ]
        : [],
    [totals],
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Orders"
        description="Confirmed orders: what was sold, delivery progress and what is left to ship."
        action={
          <Button variant="outline" asChild>
            <Link to="/quotations?status=ACCEPTED">
              <PackageCheck aria-hidden="true" />
              Accepted quotations
            </Link>
          </Button>
        }
      />

      {dashboard.isPending ? (
        <SkeletonLoader variant="kpis" count={6} label="Loading order figures" />
      ) : totals ? (
        <div className={kpiGrid(6)}>
          {tiles.map((tile) => (
            <StatCard key={tile.label} label={tile.label} icon={tile.icon} tone={tile.tone} value={formatNumber(tile.value)} hint={tile.hint} href={tile.href} />
          ))}
        </div>
      ) : (
        <ErrorState title="Could not load the order figures" error={dashboard.error} onRetry={() => void dashboard.refetch()} variant="compact" />
      )}

      <AdminList
        noun="orders"
        singular="order"
        query={orders}
        columns={columns}
        alignRight={['finalAmount']}
        onPageChange={params.setPage}
        filtered={filtered}
        emptyAction={
          <Button asChild size="sm">
            <Link to="/quotations?status=ACCEPTED">Find an accepted quotation to convert</Link>
          </Button>
        }
        toolbar={
          <ListToolbar onReset={filtered ? () => params.setMany({ search: '', status: '' }) : undefined}>
            <SearchInput label="Search orders" value={search} onChange={(value) => params.set('search', value)} />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={(value) => params.set('status', value)}
              options={ORDER_STATUSES.map(({ value, label }) => ({ value, label }))}
            />
          </ListToolbar>
        }
      />
    </div>
  )
}
