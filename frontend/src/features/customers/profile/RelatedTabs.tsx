import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { RecordSection } from '@/features/customers/profile/RecordSection'
import type { CustomerTabProps } from '@/features/customers/profile/tabs'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { opportunitiesQuery } from '@/features/opportunities/api'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { ordersQuery } from '@/features/orders/api'
import { quotationsQuery } from '@/features/quotations/api'
import { QuotationStatusBadge } from '@/features/quotations/components/QuotationStatusBadge'
import { amcContractsQuery, customerWarrantiesQuery } from '@/features/service-contracts/api'
import { AmcStatusBadge } from '@/features/service-contracts/components/AmcStatusBadge'
import { ExpiryIndicator } from '@/features/service-contracts/components/ExpiryIndicator'
import { ticketsQuery } from '@/features/support/api'
import { TicketPriorityBadge } from '@/features/support/components/TicketPriorityBadge'
import { formatDate, formatRupees } from '@/lib/format'

/** The customer's deals, quotations and orders: what has been offered and what has been sold. */
export function SalesHistoryTab({ customer }: CustomerTabProps) {
  const canSeeDeals = useHasPermission('OPPORTUNITY_VIEW')
  const canSeeQuotations = useHasPermission('QUOTATION_VIEW')
  const canSeeOrders = useHasPermission('ORDER_VIEW')

  const deals = useQuery({ ...opportunitiesQuery({ filters: { customerId: customer.id }, size: 10 }), enabled: canSeeDeals })
  const quotations = useQuery({ ...quotationsQuery({ filters: { customerId: customer.id }, size: 10, sort: 'createdAt,desc' }), enabled: canSeeQuotations })
  const orders = useQuery({ ...ordersQuery({ customerId: customer.id, size: 10 }), enabled: canSeeOrders })

  return (
    <div className="grid gap-4">
      <RecordSection
        title="Deals"
        permission="OPPORTUNITY_VIEW"
        noun="deals"
        query={deals}
        empty="No deals for this customer."
        seeAll={{ to: '/opportunities', label: 'Open the pipeline' }}
        row={(deal) => (
          <>
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{deal.title}</span>
              <span className="text-xs text-muted-foreground">
                {deal.stageName} · {deal.probability}% likely{deal.expectedCloseDate ? ` · closes ${formatDate(deal.expectedCloseDate)}` : ''}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <StatusBadge status={deal.status} domain="leadStatus" />
              <span className="text-sm font-medium tabular">{formatRupees(deal.value)}</span>
            </span>
          </>
        )}
      />
      <RecordSection
        title="Quotations"
        permission="QUOTATION_VIEW"
        noun="quotations"
        query={quotations}
        empty="No quotations for this customer."
        row={(quotation) => (
          <>
            <Link to={`/quotations/${quotation.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="text-sm font-medium">{quotation.title}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {quotation.quotationNumber} · v{quotation.currentVersionNumber}
              </span>
            </Link>
            <span className="flex items-center gap-3">
              <QuotationStatusBadge status={quotation.status} />
              <span className="text-sm font-medium tabular">{formatRupees(quotation.finalAmount, { exact: true })}</span>
            </span>
          </>
        )}
      />
      <RecordSection
        title="Orders"
        permission="ORDER_VIEW"
        noun="orders"
        query={orders}
        empty="This customer has no orders yet."
        seeAll={{ to: '/orders', label: 'All orders' }}
        row={(order) => (
          <>
            <Link to={`/orders/${order.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="text-sm font-medium">{order.title}</span>
              <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
            </Link>
            <span className="flex items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm font-medium tabular">{formatRupees(order.finalAmount, { exact: true })}</span>
            </span>
          </>
        )}
      />
    </div>
  )
}

/** The customer's support tickets, newest first. */
export function ServiceHistoryTab({ customer }: CustomerTabProps) {
  const canSee = useHasPermission('TICKET_VIEW')
  const tickets = useQuery({ ...ticketsQuery({ customerId: customer.id }), enabled: canSee })

  return (
    <RecordSection
      title="Support tickets"
      permission="TICKET_VIEW"
      noun="tickets"
      query={tickets}
      empty="No support tickets for this customer."
      seeAll={{ to: '/support/tickets', label: 'All tickets' }}
      row={(ticket) => (
        <>
          <Link to={`/support/tickets/${ticket.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
            <span className="text-sm font-medium">{ticket.subject}</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-mono">{ticket.ticketNumber}</span> · opened {formatDate(ticket.createdAt)}
            </span>
          </Link>
          <span className="flex items-center gap-2">
            {ticket.slaBreachStatus === 'BREACHED' || ticket.slaBreachStatus === 'AT_RISK' ? <StatusBadge status={ticket.slaBreachStatus} label={ticket.slaBreachStatus === 'BREACHED' ? 'SLA breached' : 'SLA at risk'} /> : null}
            <TicketPriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </span>
        </>
      )}
    />
  )
}

/** Maintenance contracts and warranties the customer holds. */
export function AmcWarrantyTab({ customer }: CustomerTabProps) {
  const canSeeContracts = useHasPermission('AMC_VIEW')
  const canSeeWarranties = useHasPermission('WARRANTY_VIEW')
  const contracts = useQuery({ ...amcContractsQuery({ customerId: customer.id, size: 10 }), enabled: canSeeContracts })
  const warranties = useQuery({ ...customerWarrantiesQuery(customer.id), enabled: canSeeWarranties })

  return (
    <div className="grid gap-4">
      <RecordSection
        title="Maintenance contracts"
        permission="AMC_VIEW"
        noun="maintenance contracts"
        query={contracts}
        empty="No maintenance contract for this customer."
        seeAll={{ to: '/amc-contracts', label: 'All contracts' }}
        row={(contract) => (
          <>
            <Link to={`/amc-contracts/${contract.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="font-mono text-sm font-medium">{contract.contractNumber}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(contract.startDate)} to {formatDate(contract.endDate)}
              </span>
            </Link>
            <span className="flex items-center gap-3">
              <ExpiryIndicator endDate={contract.endDate} />
              <AmcStatusBadge status={contract.status} />
              <span className="text-sm font-medium tabular">{formatRupees(contract.contractValue)}</span>
            </span>
          </>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Warranties
            {warranties.data ? (
              <span className="text-sm font-normal text-muted-foreground">
                {warranties.data.activeCount} active, {warranties.data.expiredCount} expired
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canSeeWarranties ? (
            <p className="text-sm text-muted-foreground">Your role cannot see warranties.</p>
          ) : warranties.isPending ? (
            <SkeletonLoader variant="list" count={2} label="Loading warranties" />
          ) : warranties.isError ? (
            <ErrorState title="Could not load warranties" error={warranties.error} onRetry={() => void warranties.refetch()} variant="compact" />
          ) : warranties.data.warranties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warranty on record for this customer.</p>
          ) : (
            <ul className="divide-y">
              {warranties.data.warranties.map((warranty) => (
                <li key={warranty.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{warranty.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(warranty.startDate)} to {formatDate(warranty.endDate)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {warranty.status === 'ACTIVE' ? <ExpiryIndicator endDate={warranty.endDate} /> : null}
                    <StatusBadge status={warranty.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Files filed against the customer. */
export function DocumentsTab({ customer }: CustomerTabProps) {
  const canSee = useHasPermission('DOCUMENT_VIEW')
  return (
    <Card>
      <CardContent>
        {canSee ? <DocumentList entityType="CUSTOMER" entityId={customer.id} /> : <p className="text-sm text-muted-foreground">Your role cannot see documents.</p>}
      </CardContent>
    </Card>
  )
}
