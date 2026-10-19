import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, CircleDollarSign, Clock, ExternalLink, PackageCheck, Truck, UserRound, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActivityTimeline, type ActivityItem } from '@/components/shared/ActivityTimeline'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormDialog } from '@/components/shared/FormDialog'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useHasPermission } from '@/features/auth/auth-context'
import { DocumentsCard } from '@/features/documents/components/DocumentsCard'
import { projectsApi } from '@/features/projects/api'
import { daysUntil, formatDate, formatDateTime, formatNumber, formatRupees, humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { orderDetailQuery, orderKeys, updateItemDelivery, type OrderDetail, type OrderItem, type OrderStatus } from '../api'
import { OrderStatusActionModal } from '../components/OrderStatusActionModal'
import { OrderStatusBadge } from '../components/OrderStatusBadge'

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', strong && 'border-t pt-3 text-base font-semibold')}>
      <dt className={strong ? undefined : 'text-muted-foreground'}>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}

/** One customer order: where it stands, what was sold and delivered, the money, and everything that happened to it. */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const canUpdate = useHasPermission('ORDER_UPDATE')
  const canCancel = useHasPermission('ORDER_CANCEL')
  const canSeeProjects = useHasPermission('PROJECT_VIEW')
  const [action, setAction] = useState<OrderStatus | null>(null)
  const [delivering, setDelivering] = useState<OrderItem | null>(null)

  const query = useQuery({ ...orderDetailQuery(id!), enabled: Boolean(id) })
  const order = query.data
  // The project made from this order, if there is one: the project search also matches order numbers.
  const projects = useQuery({ ...projectsApi.listQuery({ search: order?.orderNumber, size: 5 }), enabled: Boolean(order) && canSeeProjects })
  const project = projects.data?.items.find((candidate) => candidate.orderId === order?.id)

  if (query.isPending) return <SkeletonLoader variant="page" label="Loading the order" />
  if (query.isError || !order) return <ErrorState title="Could not load this order" error={query.error} onRetry={() => void query.refetch()} />

  const closed = order.status === 'COMPLETED' || order.status === 'CANCELLED'
  const ordered = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const delivered = order.items.reduce((sum, item) => sum + item.deliveredQuantity, 0)
  const toDelivery = order.deliveryDate ? daysUntil(order.deliveryDate) : null
  const late = !closed && toDelivery !== null && toDelivery < 0

  const history: ActivityItem[] = order.history.map((entry) => ({
    id: entry.id,
    title: entry.fromStatus && entry.toStatus ? `${humanize(entry.fromStatus)} → ${humanize(entry.toStatus)}` : humanize(entry.action),
    description: entry.notes,
    actor: entry.performedBy,
    at: entry.performedAt,
    tone: entry.toStatus === 'CANCELLED' ? 'danger' : entry.toStatus === 'COMPLETED' ? 'success' : 'info',
  }))

  return (
    <div className="grid gap-4">
      <PageHeader
        title={order.orderNumber}
        back={{ to: '/orders', label: 'Orders' }}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {order.quotationNumber ? (
              <Badge variant="neutral">
                From quotation {order.quotationNumber}
                {order.quotationVersionNumber ? ` v${order.quotationVersionNumber}` : ''}
              </Badge>
            ) : null}
          </span>
        }
        description={
          <>
            <span className="font-medium text-foreground">{order.title}</span> ·{' '}
            <Link to={`/customers/${order.customerId}`} className="underline-offset-2 hover:underline">
              {order.customerName}
            </Link>
          </>
        }
        action={
          <>
            {order.status === 'CONFIRMED' && canUpdate ? (
              <Button onClick={() => setAction('IN_PROGRESS')}>
                <Clock aria-hidden="true" />
                Start work
              </Button>
            ) : null}
            {order.status === 'IN_PROGRESS' && canUpdate ? (
              <>
                <Button variant="outline" onClick={() => setAction('PARTIALLY_DELIVERED')}>
                  <Truck aria-hidden="true" />
                  Partly delivered
                </Button>
                <Button onClick={() => setAction('COMPLETED')}>
                  <CheckCircle2 aria-hidden="true" />
                  Complete
                </Button>
              </>
            ) : null}
            {order.status === 'PARTIALLY_DELIVERED' && canUpdate ? (
              <Button onClick={() => setAction('COMPLETED')}>
                <CheckCircle2 aria-hidden="true" />
                Complete
              </Button>
            ) : null}
            {!closed && canCancel ? (
              <Button variant="outline" onClick={() => setAction('CANCELLED')}>
                <XCircle aria-hidden="true" />
                Cancel order
              </Button>
            ) : null}
          </>
        }
      />

      {order.status === 'CANCELLED' ? (
        <p role="status" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
          <span className="font-semibold">Cancelled</span>
          {order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}
          {order.cancelledBy ? ` by ${order.cancelledBy}` : ''}.{order.cancellationReason ? ` Reason: ${order.cancellationReason}` : ''}
        </p>
      ) : null}
      {order.status === 'COMPLETED' ? (
        <p role="status" className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm">
          <span className="font-semibold">Completed</span>
          {order.completedAt ? ` on ${formatDateTime(order.completedAt)}` : ''}
          {order.completedBy ? ` by ${order.completedBy}` : ''}.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Order value" icon={CircleDollarSign} value={formatRupees(order.finalAmount)} hint={order.items.length === 0 ? 'No items recorded' : `${order.items.length} line${order.items.length === 1 ? '' : 's'}, including tax`} />
        <StatCard
          label="Delivered"
          icon={PackageCheck}
          tone={delivered >= ordered && ordered > 0 ? 'success' : 'info'}
          value={ordered === 0 ? '—' : `${formatNumber(delivered)} of ${formatNumber(ordered)}`}
          hint={ordered === 0 ? 'No items to deliver' : 'Units handed over'}
        />
        <StatCard
          label="Delivery target"
          icon={CalendarClock}
          tone={late ? 'danger' : 'neutral'}
          value={order.deliveryDate ? formatDate(order.deliveryDate) : 'Not set'}
          hint={
            order.deliveryDate && !closed && toDelivery !== null
              ? late
                ? `${-toDelivery} day${toDelivery === -1 ? '' : 's'} late`
                : toDelivery === 0
                  ? 'Due today'
                  : `${toDelivery} day${toDelivery === 1 ? '' : 's'} to go`
              : undefined
          }
        />
        <StatCard label="Owner" icon={UserRound} value={order.ownerName} hint={`Created ${formatDate(order.createdAt)}`} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Items and delivery</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {order.items.length === 0 ? (
                <EmptyState variant="compact" title="No items on this order" description="Amounts were recorded without line items." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!closed && canUpdate ? <TableHead className="w-28" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const complete = item.deliveredQuantity >= item.quantity
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.serviceName}</div>
                            {item.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p> : null}
                          </TableCell>
                          <TableCell className="text-right tabular">{formatNumber(item.quantity)}</TableCell>
                          <TableCell className={cn('text-right font-medium tabular', complete ? 'text-success' : item.deliveredQuantity > 0 ? 'text-warning' : 'text-muted-foreground')}>
                            {formatNumber(item.deliveredQuantity)}
                          </TableCell>
                          <TableCell className="text-right tabular">{formatRupees(item.unitPrice, { exact: true })}</TableCell>
                          <TableCell className="text-right tabular text-muted-foreground">{item.taxPercentage ? `${item.taxPercentage}%` : '—'}</TableCell>
                          <TableCell className="text-right font-medium tabular">{formatRupees(item.totalAmount, { exact: true })}</TableCell>
                          {!closed && canUpdate ? (
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" aria-label={`Record delivery of ${item.serviceName}`} onClick={() => setDelivering(item)}>
                                Record delivery
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <DocumentsCard entityType="ORDER" entityId={order.id} />

          {order.notes || order.terms ? (
            <div className="grid gap-4 md:grid-cols-2">
              {order.notes ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap">{order.notes}</CardContent>
                </Card>
              ) : null}
              {order.terms ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">{order.terms}</CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Amounts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <dl className="grid gap-2 text-sm">
                <Row label="Subtotal" value={formatRupees(order.subtotal, { exact: true })} />
                {order.discountAmount > 0 ? <Row label="Discount" value={`−${formatRupees(order.discountAmount, { exact: true })}`} /> : null}
                <Row label="Tax" value={formatRupees(order.taxAmount, { exact: true })} />
                <Row label="Total" value={formatRupees(order.finalAmount, { exact: true })} strong />
              </dl>
              <div className="grid gap-1.5 border-t pt-3 text-sm">
                {order.quotationId ? (
                  <Link to={`/quotations/${order.quotationId}`} className="inline-flex w-fit items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline">
                    Quotation {order.quotationNumber}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
                {project ? (
                  <Link to={`/projects/${project.id}`} className="inline-flex w-fit items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline">
                    Project: {project.title}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline items={history} label="Order history" emptyTitle="Nothing recorded yet" />
            </CardContent>
          </Card>
        </div>
      </div>

      {action ? <OrderStatusActionModal open onClose={() => setAction(null)} orderId={order.id} orderNumber={order.orderNumber} targetStatus={action} /> : null}
      {delivering ? <DeliveryDialog order={order} item={delivering} onClose={() => setDelivering(null)} /> : null}
    </div>
  )
}

/** Records how many units of one line have been handed over. */
function DeliveryDialog({ order, item, onClose }: { order: OrderDetail; item: OrderItem; onClose: () => void }) {
  const queryClient = useQueryClient()
  const schema = z.object({
    delivered: z
      .string()
      .min(1, 'Enter how many have been delivered')
      .refine((value) => Number(value) >= 0, 'It cannot be negative')
      .refine((value) => Number(value) <= item.quantity, `Only ${formatNumber(item.quantity)} were ordered`),
  })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { delivered: String(item.deliveredQuantity) } })

  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => updateItemDelivery(order.id, item.id, Number(values.delivered)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Record delivery"
        description={item.serviceName}
        submitLabel="Save"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        submitting={save.isPending}
        error={save.error}
        size="sm"
      >
        <FormField
          control={form.control}
          name="delivered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivered so far</FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" min="0" max={item.quantity} step="any" {...field} />
              </FormControl>
              <FormDescription>Out of {formatNumber(item.quantity)} ordered.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
