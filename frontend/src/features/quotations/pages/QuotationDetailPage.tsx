import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, CircleDollarSign, Clock, Download, FileX2, Layers, MoreHorizontal, Pencil, Send, ShoppingBag, Trash2, UserRound, XCircle, Bell } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActivityTimeline, type ActivityItem } from '@/components/shared/ActivityTimeline'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useHasPermission } from '@/features/auth/auth-context'
import { DocumentsCard } from '@/features/documents/components/DocumentsCard'
import { ConvertQuotationToOrderModal } from '@/features/orders/components/ConvertQuotationToOrderModal'
import { ApiError } from '@/lib/api/errors'
import { daysUntil, formatDate, formatNumber, formatRupees, humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  approveQuotation,
  cancelQuotation,
  deleteQuotation,
  generateQuotationPdf,
  markQuotationAccepted,
  markQuotationRejected,
  quotationDetailQuery,
  quotationKeys,
  quotationVersionQuery,
  rejectQuotationApproval,
  requestQuotationApproval,
  sendQuotationToClient,
} from '../api'
import { CreateVersionModal } from '../components/CreateVersionModal'
import { QuotationActionModal, type QuotationActionType } from '../components/QuotationActionModal'
import { QuotationModal } from '../components/QuotationModal'
import { QuotationStatusBadge } from '../components/QuotationStatusBadge'

type ActionData = { notes?: string; reason?: string; nextFollowUpDate?: string }

/** One quotation: where it stands, its versions and lines, the money, and what has happened to it. */
export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const canUpdate = useHasPermission('QUOTATION_UPDATE')
  const canApprove = useHasPermission('QUOTATION_APPROVE')
  const canDelete = useHasPermission('QUOTATION_DELETE')
  const canCreateOrder = useHasPermission('ORDER_CREATE')

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [revising, setRevising] = useState(false)
  const [action, setAction] = useState<QuotationActionType | null>(null)
  const [converting, setConverting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pdfFailure, setPdfFailure] = useState<string | null>(null)

  const query = useQuery({ ...quotationDetailQuery(id!), enabled: Boolean(id) })
  const quotation = query.data
  const shownNumber = selectedVersion ?? quotation?.currentVersionNumber ?? 1
  const viewingOlder = selectedVersion !== null && selectedVersion !== quotation?.currentVersionNumber

  const olderVersion = useQuery({ ...quotationVersionQuery(id!, shownNumber), enabled: Boolean(id && viewingOlder) })
  const version = viewingOlder ? olderVersion.data : quotation?.currentVersion

  const refresh = () => void queryClient.invalidateQueries({ queryKey: quotationKeys.all })

  const act = useMutation({
    mutationFn: ({ type, data }: { type: QuotationActionType; data: ActionData }) => {
      switch (type) {
        case 'request_approval':
          return requestQuotationApproval(id!, data.notes)
        case 'approve':
          return approveQuotation(id!, data.notes)
        case 'reject_approval':
          return rejectQuotationApproval(id!, data.reason)
        case 'send':
          return sendQuotationToClient(id!, data.nextFollowUpDate, data.notes)
        case 'accept':
          return markQuotationAccepted(id!, data.notes)
        case 'reject':
          return markQuotationRejected(id!, data.reason || 'Customer declined')
        case 'cancel':
          return cancelQuotation(id!, data.reason)
      }
    },
    onSuccess: () => {
      refresh()
      setAction(null)
      setSelectedVersion(null)
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteQuotation(id!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: quotationKeys.detail(id!) })
      refresh()
      navigate('/quotations')
    },
    onError: () => setConfirmingDelete(false),
  })

  const pdf = useMutation({
    mutationFn: () => generateQuotationPdf(id!, version?.versionNumber),
    onMutate: () => setPdfFailure(null),
    onSuccess: (result) => window.open(result.url, '_blank', 'noopener'),
    onError: (error) => setPdfFailure(error instanceof ApiError ? error.message : 'The PDF could not be made. Try again.'),
  })

  if (query.isPending) return <SkeletonLoader variant="page" label="Loading the quotation" />
  if (query.isError || !quotation) return <ErrorState title="Could not load this quotation" error={query.error} onRetry={() => void query.refetch()} />

  const open = quotation.status !== 'CANCELLED' && quotation.status !== 'REJECTED' && quotation.status !== 'EXPIRED' && quotation.status !== 'ACCEPTED'
  const toExpiry = quotation.validUntil ? daysUntil(quotation.validUntil) : null
  const expired = open && toExpiry !== null && toExpiry < 0
  const history: ActivityItem[] = quotation.auditLogs.map((log) => ({
    id: log.id,
    title: log.fromStatus && log.toStatus ? `${humanize(log.fromStatus)} → ${humanize(log.toStatus)}` : humanize(log.action),
    description: log.notes,
    actor: log.performedBy,
    at: log.performedAt,
    tone: log.toStatus === 'ACCEPTED' || log.toStatus === 'APPROVED' ? 'success' : log.toStatus === 'REJECTED' || log.toStatus === 'CANCELLED' ? 'danger' : 'info',
  }))

  return (
    <div className="grid gap-4">
      <PageHeader
        title={quotation.quotationNumber}
        back={{ to: '/quotations', label: 'Quotations' }}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <QuotationStatusBadge status={quotation.status} />
            <Badge variant="neutral">Version {quotation.currentVersionNumber}</Badge>
          </span>
        }
        description={
          <span className="grid gap-1">
            <span className="font-medium text-foreground">{quotation.title}</span>
            <span>
              {quotation.customerName ? (
                quotation.customerId ? (
                  <Link to={`/customers/${quotation.customerId}`} className="underline-offset-2 hover:underline">
                    {quotation.customerName}
                  </Link>
                ) : (
                  quotation.customerName
                )
              ) : null}
              {quotation.leadName ? `${quotation.customerName ? ' · ' : ''}Lead ${quotation.leadName}` : ''}
              {quotation.opportunityTitle ? ` · Deal ${quotation.opportunityTitle}` : ''}
            </span>
          </span>
        }
        action={
          <>
            <Button variant="outline" onClick={() => pdf.mutate()} loading={pdf.isPending}>
              <Download aria-hidden="true" />
              PDF
            </Button>
            {quotation.status === 'DRAFT' && canUpdate ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            ) : null}
            {canUpdate && quotation.status !== 'CANCELLED' ? (
              <Button variant="outline" onClick={() => setRevising(true)}>
                <Layers aria-hidden="true" />
                New version
              </Button>
            ) : null}
            {quotation.status === 'DRAFT' && canUpdate ? (
              <>
                <Button onClick={() => setAction('request_approval')}>
                  <Clock aria-hidden="true" />
                  Submit for approval
                </Button>
              </>
            ) : null}
            {quotation.status === 'PENDING_APPROVAL' && canApprove ? (
              <>
                <Button variant="outline" onClick={() => setAction('reject_approval')}>
                  <XCircle aria-hidden="true" />
                  Send back
                </Button>
                <Button onClick={() => setAction('approve')}>
                  <CheckCircle2 aria-hidden="true" />
                  Approve
                </Button>
              </>
            ) : null}
            {(quotation.status === 'APPROVED' || quotation.status === 'DRAFT') && canUpdate ? (
              <Button variant={quotation.status === 'DRAFT' ? 'outline' : 'default'} onClick={() => setAction('send')}>
                <Send aria-hidden="true" />
                Send to customer
              </Button>
            ) : null}
            {(quotation.status === 'SENT' || quotation.status === 'VIEWED') && canUpdate ? (
              <>
                <Button variant="outline" onClick={() => setAction('reject')}>
                  <FileX2 aria-hidden="true" />
                  Declined
                </Button>
                <Button onClick={() => setAction('accept')}>
                  <CheckCircle2 aria-hidden="true" />
                  Accepted
                </Button>
              </>
            ) : null}
            {quotation.status === 'ACCEPTED' && canCreateOrder ? (
              <Button onClick={() => setConverting(true)}>
                <ShoppingBag aria-hidden="true" />
                Convert to order
              </Button>
            ) : null}
            {canDelete ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {quotation.status !== 'CANCELLED' ? (
                    <DropdownMenuItem onSelect={() => setAction('cancel')}>
                      <XCircle aria-hidden="true" />
                      Cancel quotation
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={() => setConfirmingDelete(true)}>
                    <Trash2 aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />

      {pdfFailure ? <ErrorState title="The PDF could not be made" message={pdfFailure} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="The quotation could not be deleted" error={remove.error} variant="compact" /> : null}
      {quotation.rejectionReason && quotation.status === 'DRAFT' ? (
        <p role="status" className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <span className="font-semibold">Sent back for changes</span>
          {quotation.rejectedBy ? ` by ${quotation.rejectedBy}` : ''}: {quotation.rejectionReason}
        </p>
      ) : null}
      {quotation.clientRejectionReason && quotation.status === 'REJECTED' ? (
        <p role="status" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
          <span className="font-semibold">The customer declined:</span> {quotation.clientRejectionReason}
        </p>
      ) : null}
      {quotation.cancellationReason && quotation.status === 'CANCELLED' ? (
        <p role="status" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
          <span className="font-semibold">Cancelled:</span> {quotation.cancellationReason}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Quotation value" icon={CircleDollarSign} value={formatRupees(quotation.finalAmount, { exact: true })} hint="Including GST" />
        <StatCard
          label="Valid until"
          icon={CalendarClock}
          tone={expired ? 'danger' : 'neutral'}
          value={quotation.validUntil ? formatDate(quotation.validUntil) : 'No expiry'}
          hint={
            quotation.validUntil && open && toExpiry !== null
              ? expired
                ? `Expired ${-toExpiry} day${toExpiry === -1 ? '' : 's'} ago`
                : toExpiry === 0
                  ? 'Ends today'
                  : `${toExpiry} day${toExpiry === 1 ? '' : 's'} left`
              : undefined
          }
        />
        <StatCard label="Follow up" icon={Bell} value={quotation.nextFollowUpDate ? formatDate(quotation.nextFollowUpDate) : 'Not set'} hint={quotation.sentAt ? `Sent ${formatDate(quotation.sentAt)}` : 'Not sent yet'} />
        <StatCard label="Owner" icon={UserRound} value={quotation.ownerName} hint={`Created ${formatDate(quotation.createdAt)}`} />
      </div>

      {quotation.allVersions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-soft">
          <span className="font-medium">Versions</span>
          <div role="group" aria-label="Versions of this quotation" className="flex flex-wrap gap-1.5">
            {quotation.allVersions.map((entry) => {
              const selected = version?.versionNumber === entry.versionNumber || (!version && shownNumber === entry.versionNumber)
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedVersion(entry.versionNumber === quotation.currentVersionNumber ? null : entry.versionNumber)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  v{entry.versionNumber}
                  {entry.versionNumber === quotation.currentVersionNumber ? ' (current)' : ''}
                </button>
              )
            })}
          </div>
          {version?.changeSummary ? <span className="text-muted-foreground">“{version.changeSummary}”</span> : null}
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Lines{version ? ` · version ${version.versionNumber}` : ''}</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {viewingOlder && olderVersion.isPending ? (
                <div className="p-5">
                  <SkeletonLoader variant="table" count={3} label="Loading that version" />
                </div>
              ) : !version || version.items.length === 0 ? (
                <EmptyState variant="compact" title="No lines on this version" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {version.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.serviceName}</div>
                          {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
                          {item.discountPercentage ? <p className="text-xs text-muted-foreground">{item.discountPercentage}% discount on this line</p> : null}
                        </TableCell>
                        <TableCell className="text-right tabular">{formatNumber(item.quantity)}</TableCell>
                        <TableCell className="text-right tabular">{formatRupees(item.unitPrice, { exact: true })}</TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">{item.taxPercentage ? `${item.taxPercentage}%` : '—'}</TableCell>
                        <TableCell className="text-right font-medium tabular">{formatRupees(item.totalAmount, { exact: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <DocumentsCard entityType="QUOTATION" entityId={quotation.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{version?.terms || <span className="text-muted-foreground">No terms recorded.</span>}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Internal notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">{version?.notes || 'No internal notes.'}</CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {version ? (
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Before tax</dt>
                    <dd className="tabular">{formatRupees(version.subtotal, { exact: true })}</dd>
                  </div>
                  {version.discountAmount > 0 ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Discount{version.discountPercentage ? ` (${version.discountPercentage}%)` : ''}</dt>
                      <dd className="tabular">−{formatRupees(version.discountAmount, { exact: true })}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">GST</dt>
                    <dd className="tabular">{formatRupees(version.taxAmount, { exact: true })}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular">{formatRupees(version.finalAmount, { exact: true })}</dd>
                  </div>
                </dl>
              ) : (
                <SkeletonLoader variant="list" count={3} label="Loading the pricing" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline items={history} label="Quotation history" emptyTitle="Nothing recorded yet" />
            </CardContent>
          </Card>
        </div>
      </div>

      {editing ? <QuotationModal open onOpenChange={setEditing} quotation={quotation} onSuccess={refresh} /> : null}
      {revising ? <CreateVersionModal open onOpenChange={setRevising} quotation={quotation} onSuccess={() => { refresh(); setSelectedVersion(null) }} /> : null}
      {action ? (
        <QuotationActionModal
          open
          onOpenChange={(next) => (next ? undefined : setAction(null))}
          actionType={action}
          quotationNumber={quotation.quotationNumber}
          isPending={act.isPending}
          error={act.error}
          onConfirm={(data) => act.mutate({ type: action, data })}
        />
      ) : null}
      {converting ? <ConvertQuotationToOrderModal open onClose={() => setConverting(false)} quotation={quotation} /> : null}
      <ConfirmationDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this quotation?"
        description={`${quotation.quotationNumber} and its versions will be removed. To keep the record, cancel it instead.`}
        confirmLabel="Delete quotation"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
