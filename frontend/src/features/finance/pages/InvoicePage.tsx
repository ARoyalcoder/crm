import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Hash,
  MapPin,
  Pencil,
  Printer,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { RecordLoadState } from '@/components/forms/FormParts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  addCreditNote,
  addDays,
  addDebitNote,
  cancelInvoice,
  discardInvoice,
  financeKeys,
  financeSettingsQuery,
  formatDay,
  formatMoney,
  invoiceQuery,
  isAnswered,
  issueInvoice,
  newIdempotencyKey,
  refreshFinance,
  type AdjustmentNote,
  type InvoiceDetail,
} from '@/features/finance/api'
import { InvoiceStatusBadge } from '@/features/finance/components/FinanceParts'
import { ReasonForm } from '@/features/finance/components/ReasonForm'
import { cn } from '@/lib/utils'

type Panel = 'issue' | 'credit' | 'debit' | 'cancel' | 'discard' | null

/** One invoice (`/invoices/:id`): redesigned executive view with high-clarity stats, line items, and audit trail. */
export function InvoicePage() {
  const { id = '' } = useParams()
  const invoice = useQuery(invoiceQuery(id))
  const back = { to: '/invoices', label: 'Invoices' }

  if (!invoice.data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Invoice" back={back} />
        <RecordLoadState noun="invoice" isPending={invoice.isPending} error={invoice.error} onRetry={() => void invoice.refetch()} />
      </div>
    )
  }
  return <InvoiceView detail={invoice.data} back={back} />
}

function InvoiceView({ detail, back }: { detail: InvoiceDetail; back: { to: string; label: string } }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const settings = useQuery(financeSettingsQuery)
  const [panel, setPanel] = useState<Panel>(null)
  const [copied, setCopied] = useState(false)
  const { invoice, actions } = detail
  const id = invoice.id
  const draft = invoice.status === 'DRAFT'
  const isCancelled = invoice.status === 'CANCELLED'
  const isPaid = invoice.status === 'PAID'
  const isOverdue = invoice.status === 'OVERDUE'
  const today = settings.data?.today ?? new Date().toISOString().slice(0, 10)

  const paidPercent = invoice.total > 0 ? Math.min(100, Math.round((invoice.amountPaid / invoice.total) * 100)) : 0

  /** Every action answers with the whole invoice, so the page is replaced by the answer. */
  const act = useMutation({
    mutationFn: (action: () => Promise<InvoiceDetail>) => action(),
    onSuccess: (updated) => {
      queryClient.setQueryData(financeKeys.invoice(id), updated)
      setPanel(null)
      return refreshFinance(queryClient)
    },
  })

  const discard = useMutation({
    mutationFn: () => discardInvoice(id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: financeKeys.invoice(id) })
      await refreshFinance(queryClient)
      void navigate('/invoices')
    },
  })

  const open = (next: Panel) => {
    act.reset()
    discard.reset()
    setPanel(panel === next ? null : next)
  }

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pb-12">
      {/* Top Banner Navigation & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Link to={back.to} className="transition-colors hover:text-foreground">
              {back.label}
            </Link>
            <ChevronRight className="size-3" />
            <span className="font-mono text-foreground">{invoice.invoiceNumber ?? 'DRAFT'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {invoice.invoiceNumber ?? 'Draft Invoice'}
            </h1>
            {invoice.invoiceNumber && (
              <button
                type="button"
                onClick={() => handleCopy(invoice.invoiceNumber ?? '')}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground shadow-xs transition hover:bg-muted hover:text-foreground"
                title="Copy invoice number"
              >
                {copied ? <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
            <InvoiceStatusBadge status={invoice.status} daysOverdue={invoice.daysOverdue} />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {actions.edit && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/invoices/${id}/edit`}>
                <Pencil className="size-3.5" />
                <span>Edit</span>
              </Link>
            </Button>
          )}

          {!draft && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to={`/invoices/${id}/print`}>
                <Printer className="size-3.5" />
                <span>Print</span>
              </Link>
            </Button>
          )}

          {actions.recordPayment && (
            <Button asChild size="sm" className="gap-1.5 bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              <Link to={`/payments/new?customerId=${invoice.customerId}&invoiceId=${id}`}>
                <Banknote className="size-3.5" />
                <span>Record Payment</span>
              </Link>
            </Button>
          )}

          {actions.issue && (
            <Button size="sm" onClick={() => open('issue')} className="gap-1.5 font-medium shadow-sm">
              <Sparkles className="size-3.5" />
              <span>Issue Invoice</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {draft && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm leading-relaxed">
            <span className="font-semibold">Draft Invoice:</span> This document is still pending final issuance. It holds no legal
            number and is not currently recognized as an outstanding claim. Once issued, details cannot be directly modified.
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <XCircle className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm leading-relaxed">
            <span className="font-semibold">Cancelled Invoice</span>
            {detail.cancelledAt ? ` on ${formatDay(detail.cancelledAt.slice(0, 10))}` : ''}:{' '}
            {detail.cancellationReason || 'No reason provided.'} This invoice has been nullified and settles nothing.
          </div>
        </div>
      )}

      {/* 4 Key Executive Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Billed */}
        <Card className="relative overflow-hidden border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Total Billed</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(invoice.total)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{detail.items.length} {detail.items.length === 1 ? 'line item' : 'line items'}</span>
            {detail.taxTotal > 0 && <span>· Incl. {formatMoney(detail.taxTotal)} tax</span>}
          </div>
        </Card>

        {/* Amount Paid */}
        <Card className="relative overflow-hidden border border-border/70 bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Amount Paid</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(invoice.amountPaid)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-400"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <span className="font-medium text-foreground">{paidPercent}%</span>
            </div>
            <span>{detail.payments.filter((p) => !p.released).length} applied</span>
          </div>
        </Card>

        {/* Outstanding / Balance Due */}
        <Card
          className={cn(
            'relative overflow-hidden border p-4 transition-all hover:shadow-md',
            invoice.outstanding > 0
              ? 'border-amber-500/30 bg-amber-500/[0.02] hover:border-amber-500/60'
              : 'border-border/70 bg-card hover:border-border',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Balance Due</span>
            <div
              className={cn(
                'rounded-lg p-2',
                invoice.outstanding > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground',
              )}
            >
              <CreditCard className="size-4" />
            </div>
          </div>
          <div
            className={cn(
              'mt-2 text-2xl font-bold tracking-tight tabular-nums',
              invoice.outstanding > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-foreground',
            )}
          >
            {draft || isCancelled ? '₹0.00' : formatMoney(invoice.outstanding)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {draft
              ? 'N/A (Draft status)'
              : isCancelled
                ? 'Cancelled invoice'
                : isPaid
                  ? 'Settled in full'
                  : 'Pending customer settlement'}
          </div>
        </Card>

        {/* Due Date & Lifecycle */}
        <Card className="relative overflow-hidden border border-border/70 bg-card p-4 transition-all hover:border-border hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Payment Timeline</span>
            <div
              className={cn(
                'rounded-lg p-2',
                isOverdue
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {isOverdue ? <Clock className="size-4" /> : <Calendar className="size-4" />}
            </div>
          </div>
          <div className="mt-2 text-base font-semibold tracking-tight text-foreground">
            {draft ? (
              <span>Net {detail.paymentTermsDays} Days</span>
            ) : (
              <span>Due {formatDay(invoice.dueDate)}</span>
            )}
          </div>
          <div className="mt-2 text-xs">
            {isOverdue ? (
              <span className="font-medium text-destructive">
                {invoice.daysOverdue ?? 0} {invoice.daysOverdue === 1 ? 'day' : 'days'} overdue
              </span>
            ) : isPaid ? (
              <span className="text-emerald-600 dark:text-emerald-400">Payment completed</span>
            ) : draft ? (
              <span className="text-muted-foreground">Terms will start on issuance</span>
            ) : (
              <span className="text-muted-foreground">Issued {formatDay(invoice.issueDate)}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Main Grid: Customer / Billing Card & Meta Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Customer & Billing Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <CardTitle>Customer & Billing Details</CardTitle>
              </div>
              <Link
                to={`/customers/${invoice.customerId}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                View Account →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 pt-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Billed Customer</span>
              <div className="mt-1 font-semibold text-foreground">
                <Link to={`/customers/${invoice.customerId}`} className="hover:text-primary hover:underline">
                  {invoice.customerName}
                </Link>
              </div>
              {detail.customerTaxId ? (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-[11px] font-normal">
                    GSTIN: {detail.customerTaxId}
                  </Badge>
                </div>
              ) : (
                <span className="mt-1 block text-xs text-muted-foreground italic">No GSTIN registered</span>
              )}

              {detail.reference && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Customer Reference / PO</span>
                  <p className="mt-1 font-mono text-xs font-medium text-foreground">{detail.reference}</p>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Billing Address</span>
              <div className="mt-1.5 flex items-start gap-2 text-sm text-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="leading-relaxed whitespace-pre-line">
                  {detail.billingAddress || <span className="text-muted-foreground italic">No address on file</span>}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Metadata Card */}
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Status</span>
              <InvoiceStatusBadge status={invoice.status} daysOverdue={invoice.daysOverdue} />
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Issue Date</span>
              <span className="font-medium text-foreground">{formatDay(invoice.issueDate)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium text-foreground">
                {draft ? `${detail.paymentTermsDays} days net` : formatDay(invoice.dueDate)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Payment Terms</span>
              <span className="font-medium text-foreground">{detail.paymentTermsDays} Days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Issued By</span>
              <span className="font-medium text-foreground">{detail.issuedByName ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table & Cost Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Billed Items & Services</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {detail.items.length} {detail.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="py-3 pr-4 pl-4 sm:pl-6">
                    Description & Item
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Qty
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Unit Price
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Discount
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Tax
                  </th>
                  <th scope="col" className="py-3 pr-4 pl-3 text-right sm:pr-6">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {detail.items.map((item, index) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="py-3.5 pr-4 pl-4 sm:pl-6">
                      <div className="font-medium text-foreground">{item.description}</div>
                      {item.hsnSac && (
                        <div className="mt-0.5">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            HSN/SAC {item.hsnSac}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-foreground">
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-foreground">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {item.discountPercent ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {item.discountPercent}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {item.taxPercent ? (
                        <span>
                          {item.taxPercent}%
                          {item.taxAmount > 0 && (
                            <span className="block text-[10px] text-muted-foreground/80">
                              ({formatMoney(item.taxAmount)})
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 pr-4 pl-3 text-right font-mono text-sm font-semibold tabular-nums text-foreground sm:pr-6">
                      {formatMoney(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown Section */}
          <div className="flex flex-col justify-end border-t border-border/60 bg-muted/10 p-4 sm:flex-row sm:p-6">
            <div className="w-full max-w-sm space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-foreground">{formatMoney(detail.subtotal)}</span>
              </div>

              {detail.discountTotal > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="size-3.5" />
                    Discount Applied
                  </span>
                  <span className="font-mono tabular-nums">− {formatMoney(detail.discountTotal)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Applicable Tax</span>
                <span className="font-mono tabular-nums text-foreground">{formatMoney(detail.taxTotal)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-bold text-foreground">
                <span>Invoice Total</span>
                <span className="font-mono tabular-nums">{formatMoney(invoice.total)}</span>
              </div>

              {detail.debitTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="size-3" />
                    Debit Notes
                  </span>
                  <span className="font-mono tabular-nums">+ {formatMoney(detail.debitTotal)}</span>
                </div>
              )}

              {detail.creditTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="size-3" />
                    Credit Notes
                  </span>
                  <span className="font-mono tabular-nums">− {formatMoney(detail.creditTotal)}</span>
                </div>
              )}

              {!draft && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Payments Received</span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    − {formatMoney(invoice.amountPaid)}
                  </span>
                </div>
              )}

              {!draft && !isCancelled && (
                <div className="flex items-center justify-between rounded-lg bg-card p-3 shadow-xs ring-1 ring-border/80">
                  <span className="text-sm font-semibold text-foreground">Net Balance Due</span>
                  <span
                    className={cn(
                      'font-mono text-base font-bold tabular-nums',
                      invoice.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {formatMoney(invoice.outstanding)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Allocation History */}
      {!draft && (
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle>Payments & Receipts History</CardTitle>
              </div>
              {actions.recordPayment && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                  <Link to={`/payments/new?customerId=${invoice.customerId}&invoiceId=${id}`}>
                    <Banknote className="size-3.5" />
                    Record Payment
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {detail.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <CreditCard className="mb-2 size-8 opacity-40" />
                <p className="text-sm font-medium">No payments allocated yet</p>
                <p className="text-xs">When a payment is received against this invoice, it will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {detail.payments.map((payment) => (
                  <div
                    key={payment.allocationId}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/payments/${payment.paymentId}`}
                            className="font-mono text-sm font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            {payment.paymentNumber}
                          </Link>
                          <Badge variant="outline" className="text-[10px]">
                            {payment.methodName}
                          </Badge>
                          {payment.released && (
                            <Badge variant="destructive" className="text-[10px]">
                              Released / Revoked
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Received on {formatDay(payment.receivedOn)}
                          {payment.allocatedByName ? ` · Allocated by ${payment.allocatedByName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={cn(
                          'font-mono text-sm font-bold tabular-nums',
                          payment.released ? 'text-muted-foreground line-through' : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {formatMoney(payment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Adjustments: Credit & Debit Notes */}
      {detail.creditNotes.length > 0 && (
        <AdjustmentNotesCard
          title="Credit Notes Applied"
          icon={<ArrowDownRight className="size-4 text-emerald-600 dark:text-emerald-400" />}
          notes={detail.creditNotes}
          sign="−"
          variant="credit"
        />
      )}

      {detail.debitNotes.length > 0 && (
        <AdjustmentNotesCard
          title="Debit Notes Applied"
          icon={<ArrowUpRight className="size-4 text-amber-600 dark:text-amber-400" />}
          notes={detail.debitNotes}
          sign="+"
          variant="debit"
        />
      )}

      {/* Notes & Terms Section */}
      {(detail.notes || detail.terms) && (
        <Card>
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm font-semibold">Terms & Customer Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 text-sm sm:grid-cols-2">
            {detail.notes && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Remarks / Notes</span>
                <p className="mt-1.5 leading-relaxed text-foreground whitespace-pre-line">{detail.notes}</p>
              </div>
            )}
            {detail.terms && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase">Payment Terms</span>
                <p className="mt-1.5 leading-relaxed text-muted-foreground whitespace-pre-line">{detail.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management Actions & Forms Panel */}
      {(actions.issue || actions.discard || actions.creditNote || actions.debitNote || actions.cancel) && (
        <Card className="border-border/80 bg-card">
          <CardHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              <CardTitle>Invoice Operations & Adjustments</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {actions.issue && (
                <Button onClick={() => open('issue')} className="gap-1.5">
                  <Sparkles className="size-3.5" />
                  Issue Invoice
                </Button>
              )}
              {actions.creditNote && (
                <Button variant="outline" onClick={() => open('credit')} className="gap-1.5">
                  <ArrowDownRight className="size-3.5 text-emerald-600" />
                  Credit Note
                </Button>
              )}
              {actions.debitNote && (
                <Button variant="outline" onClick={() => open('debit')} className="gap-1.5">
                  <ArrowUpRight className="size-3.5 text-amber-600" />
                  Debit Note
                </Button>
              )}
              {actions.cancel && (
                <Button variant="outline" onClick={() => open('cancel')} className="gap-1.5 text-destructive hover:bg-destructive/10">
                  <XCircle className="size-3.5" />
                  Cancel Invoice
                </Button>
              )}
              {actions.discard && (
                <Button variant="outline" onClick={() => open('discard')} className="gap-1.5 text-destructive hover:bg-destructive/10">
                  Discard Draft
                </Button>
              )}
            </div>

            {act.error && <ErrorState title="That could not be done" error={act.error} />}
            {discard.error && <ErrorState title="The draft could not be discarded" error={discard.error} />}

            {panel === 'issue' && (
              <IssueForm
                today={today}
                termsDays={detail.paymentTermsDays}
                total={invoice.total}
                busy={act.isPending}
                onIssue={(dates) => act.mutate(() => issueInvoice(id, dates))}
              />
            )}
            {panel === 'credit' && (
              <NoteForm
                title="Issue Credit Note"
                explanation={`Reduces what is owed on this invoice. At most ${formatMoney(invoice.outstanding)}, which is the current outstanding balance.`}
                submitLabel="Record Credit Note"
                busy={act.isPending}
                failed={act.error}
                onSubmit={(input, key) => act.mutate(() => addCreditNote(id, input, key))}
              />
            )}
            {panel === 'debit' && (
              <NoteForm
                title="Issue Debit Note"
                explanation="Increases what is owed: extra scope, unbilled quantities, or price adjustments."
                submitLabel="Record Debit Note"
                busy={act.isPending}
                failed={act.error}
                onSubmit={(input, key) => act.mutate(() => addDebitNote(id, input, key))}
              />
            )}
            {panel === 'cancel' && (
              <ReasonForm
                title="Cancel Invoice"
                explanation="The invoice retains its audit trail and remains on record marked cancelled. Any remaining balance is written off. This action cannot be reversed."
                submitLabel="Confirm Cancellation"
                busy={act.isPending}
                onSubmit={(reason) => act.mutate(() => cancelInvoice(id, reason))}
              />
            )}
            {panel === 'discard' && (
              <div className="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  Discard this draft invoice permanently? Since it has not been issued, no audit record will be kept.
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" disabled={discard.isPending} onClick={() => discard.mutate()}>
                    {discard.isPending ? 'Discarding…' : 'Discard Draft'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPanel(null)}>
                    Keep Draft
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AdjustmentNotesCard({
  title,
  icon,
  notes,
  sign,
  variant,
}: {
  title: string
  icon: ReactNode
  notes: AdjustmentNote[]
  sign: string
  variant: 'credit' | 'debit'
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="divide-y divide-border/50">
          {notes.map((note) => (
            <div key={note.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{note.noteNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDay(note.noteDate)} · Issued by {note.issuedByName}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground">{note.reason}</p>
              </div>
              <div
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  variant === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {sign} {formatMoney(note.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

type IssueFormProps = {
  today: string
  termsDays: number
  total: number
  busy: boolean
  onIssue: (dates: { issueDate: string; dueDate: string }) => void
}

function IssueForm({ today, termsDays, total, busy, onIssue }: IssueFormProps) {
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const due = dueDate ?? addDays(issueDate, termsDays)
  const problem =
    issueDate > today
      ? 'The issue date cannot be in the future.'
      : due < issueDate
        ? 'Due date cannot be before issue date.'
        : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!problem) {
      onIssue({ issueDate, dueDate: due })
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-label="Issue invoice">
      <div className="text-sm font-medium text-foreground">
        Issuing generates the official invoice number and creates a payable claim of {formatMoney(total)}.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="issue-date" className="text-xs">Issue Date</Label>
          <Input id="issue-date" type="date" max={today} value={issueDate} onChange={(event) => setIssueDate(event.target.value || today)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="due-date" className="text-xs">Due Date</Label>
          <Input id="due-date" type="date" min={issueDate} value={due} onChange={(event) => setDueDate(event.target.value || null)} />
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </p>
      )}
      <Button type="submit" size="sm" className="w-fit" disabled={busy || problem !== null}>
        {busy ? 'Issuing Invoice…' : 'Confirm & Issue Invoice'}
      </Button>
    </form>
  )
}

type NoteFormProps = {
  title: string
  explanation: string
  submitLabel: string
  busy: boolean
  failed: unknown
  onSubmit: (input: { amount: number; reason: string }, idempotencyKey: string) => void
}

function NoteForm({ title, explanation, submitLabel, busy, failed, onSubmit }: NoteFormProps) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [key, setKey] = useState(newIdempotencyKey)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) {
      setProblem('Enter an amount above zero, up to 2 decimal places.')
      return
    }
    if (reason.trim() === '') {
      setProblem('Please provide an explanatory reason for the audit note.')
      return
    }
    setProblem(null)
    const next = isAnswered(failed) ? newIdempotencyKey() : key
    setKey(next)
    onSubmit({ amount: Number(amount), reason: reason.trim() }, next)
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5 rounded-xl border border-border bg-card p-4" aria-label={title}>
      <div className="text-xs text-muted-foreground">{explanation}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="note-amount" className="text-xs">Amount (₹)</Label>
          <Input id="note-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="note-reason" className="text-xs">Reason / Explanation</Label>
          <Input id="note-reason" maxLength={500} placeholder="e.g. Scope adjustment or discount agreement" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </p>
      )}
      <Button type="submit" size="sm" className="w-fit" disabled={busy}>
        {busy ? 'Recording…' : submitLabel}
      </Button>
    </form>
  )
}
