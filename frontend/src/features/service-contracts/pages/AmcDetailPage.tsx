import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CalendarClock, CircleDollarSign, Pencil, Plus, Power, RefreshCw } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { DocumentsCard } from '@/features/documents/components/DocumentsCard'
import { ApiError } from '@/lib/api/errors'
import { formatDate, formatDateTime, formatNumber, formatRupees, isoDate } from '@/lib/format'
import {
  AMC_FREQUENCIES,
  amcContractDetailQuery,
  amcKeys,
  updateAmcContract,
  updateServiceVisit,
  type AmcContractDetail,
  type VisitView,
} from '../api'
import { AmcStatusBadge } from '../components/AmcStatusBadge'
import { CompleteVisitDialog, RenewContractDialog, ScheduleVisitDialog } from '../components/ContractDialogs'
import { ExpiryIndicator } from '../components/ExpiryIndicator'
import { RenewalStatusBadge } from '../components/RenewalStatusBadge'
import { ServiceVisitCard } from '../components/ServiceVisitCard'

/** A contract's money in its own currency; rupees in the usual Indian grouping. */
function money(contract: AmcContractDetail): string {
  return contract.currency === 'INR' ? formatRupees(contract.contractValue) : `${contract.currency} ${formatNumber(contract.contractValue)}`
}

/** Open visits first, soonest first; closed ones after, most recent first. */
function sortVisits(visits: VisitView[]): VisitView[] {
  const open = visits.filter((visit) => visit.status === 'SCHEDULED').sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  const closed = visits.filter((visit) => visit.status !== 'SCHEDULED').sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  return [...open, ...closed]
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** One annual maintenance contract: who it is with, what it costs, when it ends, and its service visits. */
export function AmcDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canManage = useHasPermission('AMC_MANAGE')

  const [renewing, setRenewing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [completing, setCompleting] = useState<VisitView | null>(null)
  const [cancelling, setCancelling] = useState<VisitView | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const query = useQuery({ ...amcContractDetailQuery(id!), enabled: Boolean(id) })
  const contract = query.data

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: amcKeys.detail(id!) })
    void queryClient.invalidateQueries({ queryKey: amcKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: amcKeys.dashboard() })
  }
  const explain = (error: unknown, fallback: string) => setFailure(error instanceof ApiError ? error.message : fallback)

  const cancelVisit = useMutation({
    mutationFn: (visit: VisitView) => updateServiceVisit(visit.id, { status: 'CANCELLED' }),
    onSuccess: () => {
      refresh()
      setCancelling(null)
    },
    onError: (error) => {
      setCancelling(null)
      explain(error, 'The visit could not be cancelled. Try again.')
    },
  })

  // A new contract is a draft: it is not counted, and its visits and renewals are not tracked, until it is activated.
  const activate = useMutation({
    mutationFn: (current: AmcContractDetail) =>
      updateAmcContract(current.id, {
        customerId: current.customerId,
        serviceOfferingId: current.serviceOfferingId ?? undefined,
        projectId: current.projectId ?? undefined,
        contractValue: current.contractValue,
        currency: current.currency,
        startDate: current.startDate,
        endDate: current.endDate,
        frequency: current.frequency,
        assignedEmployeeId: current.assignedEmployeeId ?? undefined,
        slaId: current.slaId ?? undefined,
        terms: current.terms ?? undefined,
        notes: current.notes ?? undefined,
        status: 'ACTIVE',
      }),
    onSuccess: refresh,
    onError: (error) => explain(error, 'The contract could not be activated. Try again.'),
  })

  if (query.isPending) return <SkeletonLoader variant="page" label="Loading the contract" />
  if (query.isError || !contract) {
    return <ErrorState title="Could not load this contract" error={query.error} onRetry={() => void query.refetch()} />
  }

  const frequency = AMC_FREQUENCIES.find((option) => option.value === contract.frequency)?.label ?? contract.frequency
  const visits = sortVisits(contract.visits)
  const nextVisit = visits.find((visit) => visit.status === 'SCHEDULED')
  const nextIsLate = nextVisit ? nextVisit.scheduledDate < isoDate(new Date()) : false
  const editable = canManage && contract.status !== 'CANCELLED'
  const canRenew = canManage && (contract.status === 'ACTIVE' || contract.status === 'RENEWAL_PENDING') && contract.renewalStatus !== 'RENEWED'
  const showRenewal = contract.renewalStatus !== 'NOT_DUE'

  return (
    <div className="grid gap-4">
      <PageHeader
        title={contract.contractNumber}
        back={{ to: '/amc-contracts', label: 'AMC contracts' }}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <AmcStatusBadge status={contract.status} />
            {showRenewal ? <RenewalStatusBadge status={contract.renewalStatus} /> : null}
          </span>
        }
        description={
          <>
            <Link to={`/customers/${contract.customerId}`} className="font-medium text-foreground underline-offset-2 hover:underline">
              {contract.customerName ?? 'Customer'}
            </Link>
            {contract.serviceName ? ` · ${contract.serviceName}` : ''}
          </>
        }
        action={
          canManage ? (
            <>
              {contract.status === 'DRAFT' ? (
                <Button onClick={() => activate.mutate(contract)} loading={activate.isPending}>
                  <Power aria-hidden="true" />
                  Activate contract
                </Button>
              ) : null}
              {editable ? (
                <Button variant="outline" asChild>
                  <Link to={`/amc-contracts/${contract.id}/edit`}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Link>
                </Button>
              ) : null}
              {canRenew ? (
                <Button onClick={() => setRenewing(true)}>
                  <RefreshCw aria-hidden="true" />
                  Renew
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {failure ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
          {failure}
        </p>
      ) : null}

      {contract.status === 'DRAFT' ? (
        <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          Draft: not counted as in force, and visits and renewal are not tracked, until activated.
        </p>
      ) : null}

      {contract.renewedFromId ? (
        <p className="text-sm text-muted-foreground">
          This contract renews{' '}
          <Link to={`/amc-contracts/${contract.renewedFromId}`} className="font-medium text-primary underline-offset-2 hover:underline">
            the one before it
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Contract value" icon={CircleDollarSign} value={money(contract)} hint={`${frequency} visits`} />
        <StatCard
          label="Ends"
          icon={CalendarClock}
          value={formatDate(contract.endDate)}
          hint={<ExpiryIndicator endDate={contract.endDate} />}
          tone={contract.status === 'EXPIRED' ? 'danger' : 'neutral'}
        />
        <StatCard
          label="Next visit"
          icon={CalendarCheck}
          value={nextVisit ? formatDate(nextVisit.scheduledDate) : 'None planned'}
          hint={nextVisit ? `${nextIsLate ? 'Overdue · ' : ''}${nextVisit.assignedEmployeeName ?? 'Nobody assigned yet'}` : 'Schedule one below'}
          tone={nextIsLate ? 'warning' : 'info'}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <section aria-labelledby="visits-heading" className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="visits-heading" className="text-base font-semibold tracking-tight">
                Service visits{visits.length > 0 ? ` (${visits.length})` : ''}
              </h2>
              {editable ? (
                <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
                  <Plus aria-hidden="true" />
                  Schedule visit
                </Button>
              ) : null}
            </div>
            {visits.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No visits yet"
                description={
                  editable ? 'Schedule the first visit so someone is expected on site.' : 'No visit scheduled for this contract.'
                }
              />
            ) : (
              <div className="grid gap-3">
                {visits.map((visit) => (
                  <ServiceVisitCard
                    key={visit.id}
                    visit={visit}
                    canManage={canManage}
                    onComplete={setCompleting}
                    onCancel={setCancelling}
                  />
                ))}
              </div>
            )}
          </section>

          <DocumentsCard entityType="AMC_CONTRACT" entityId={contract.id} />

          {contract.terms || contract.notes ? (
            <div className="grid gap-4 md:grid-cols-2">
              {contract.terms ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap">{contract.terms}</CardContent>
                </Card>
              ) : null}
              {contract.notes ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Internal notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">{contract.notes}</CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Fact label="Customer">
                <Link to={`/customers/${contract.customerId}`} className="underline-offset-2 hover:underline">
                  {contract.customerName ?? 'Customer'}
                </Link>
              </Fact>
              <Fact label="Service">{contract.serviceName ?? '—'}</Fact>
              <Fact label="Project">
                {contract.projectId ? (
                  <Link to={`/projects/${contract.projectId}`} className="underline-offset-2 hover:underline">
                    {contract.projectTitle ?? 'Project'}
                  </Link>
                ) : (
                  '—'
                )}
              </Fact>
              <Fact label="Looked after by">{contract.assignedEmployeeName ?? '—'}</Fact>
              <Fact label="Visits">{frequency}</Fact>
              <Fact label="Starts">{formatDate(contract.startDate)}</Fact>
              <Fact label="Ends">{formatDate(contract.endDate)}</Fact>
              <Fact label="Value">{money(contract)}</Fact>
              <Fact label="Created">
                {formatDateTime(contract.createdAt)}
                <span className="block truncate text-xs text-muted-foreground" title={contract.createdBy}>
                  by {contract.createdBy}
                </span>
              </Fact>
              <Fact label="Last changed">
                {formatDateTime(contract.updatedAt)}
                <span className="block truncate text-xs text-muted-foreground" title={contract.updatedBy}>
                  by {contract.updatedBy}
                </span>
              </Fact>
            </dl>
          </CardContent>
        </Card>
      </div>

      {renewing ? (
        <RenewContractDialog
          open
          onOpenChange={setRenewing}
          contract={contract}
          onRenewed={(renewed) => {
            setRenewing(false)
            navigate(`/amc-contracts/${renewed.id}`)
          }}
        />
      ) : null}
      {scheduling ? <ScheduleVisitDialog open onOpenChange={setScheduling} contract={contract} /> : null}
      {completing ? <CompleteVisitDialog visit={completing} contractId={contract.id} onClose={() => setCompleting(null)} /> : null}
      <ConfirmationDialog
        open={cancelling !== null}
        onOpenChange={(open) => (open ? undefined : setCancelling(null))}
        title="Cancel this visit?"
        description={cancelling ? `The ${formatDate(cancelling.scheduledDate)} visit will no longer be expected. You can schedule another.` : undefined}
        confirmLabel="Cancel visit"
        destructive
        pending={cancelVisit.isPending}
        onConfirm={() => cancelling && cancelVisit.mutate(cancelling)}
      />
    </div>
  )
}
