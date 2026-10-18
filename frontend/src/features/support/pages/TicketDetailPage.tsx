import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/features/auth/auth-context'
import {
  closeTicket,
  resolveTicket,
  ticketKeys,
  ticketQuery,
} from '@/features/support/api'
import { CommentFeed } from '@/features/support/components/CommentFeed'
import { SlaTimer } from '@/features/support/components/SlaTimer'
import { TicketPriorityBadge } from '@/features/support/components/TicketPriorityBadge'
import { TicketStatusBadge } from '@/features/support/components/TicketStatusBadge'

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Full ticket view with comments, history, and action buttons. */
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const hasResolve = useHasPermission('TICKET_RESOLVE')
  const canManage = useHasPermission('TICKET_MANAGE')
  const canResolve = hasResolve || canManage

  const { data, isPending, isError, error, refetch } = useQuery(ticketQuery(id!))

  const resolveMutation = useMutation({
    mutationFn: () => resolveTicket(id!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id!) }),
  })

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(id!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id!) }),
  })

  if (isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-16 w-full rounded-xl" aria-busy="true" aria-label="Loading ticket" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Could not load ticket" error={error} onRetry={() => void refetch()} />
  }

  const { ticket, description, comments, attachments, statusHistory, firstResponseAt, resolvedAt } = data
  const isTerminal = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <div className="grid gap-4">
      <PageHeader
        title={`${ticket.ticketNumber} — ${ticket.subject}`}
        back={{ to: '/support/tickets', label: 'All tickets' }}
        action={
          <div className="flex flex-wrap gap-2">
            {canResolve && !isTerminal && (
              <Button
                variant="outline"
                size="sm"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate()}
              >
                <CheckCircle className="size-4" aria-hidden="true" />
                Resolve
              </Button>
            )}
            {canManage && ticket.status === 'RESOLVED' && (
              <Button
                variant="outline"
                size="sm"
                disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate()}
              >
                <XCircle className="size-4" aria-hidden="true" />
                Close
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main content */}
        <div className="grid gap-4 lg:col-span-2">
          {/* Description */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Description
            </h2>
            {description ? (
              <p className="whitespace-pre-wrap text-sm">{description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description provided.</p>
            )}
          </section>

          {/* Comments */}
          <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Comments
            </h2>
            <CommentFeed
              ticketId={ticket.id}
              comments={comments}
              canAddInternal={canManage}
            />
          </section>

          {/* Attachments */}
          {attachments.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Attachments
              </h2>
              <ul className="grid gap-2">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{a.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      {(a.fileSize / 1024).toFixed(0)} KB — {a.uploadedByName}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 content-start">
          {/* Details */}
          <section className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Details
            </h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd><TicketStatusBadge status={ticket.status} /></dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Priority</dt>
                <dd><TicketPriorityBadge priority={ticket.priority} /></dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">SLA deadline</dt>
                <dd>
                  <SlaTimer
                    dueAt={ticket.dueAt}
                    slaBreachStatus={ticket.slaBreachStatus}
                    resolvedAt={resolvedAt ?? undefined}
                  />
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="text-right">{ticket.customerName}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Assigned to</dt>
                <dd className="text-right">{ticket.assignedUserName ?? '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Opened</dt>
                <dd>{dateFormat.format(new Date(ticket.createdAt))}</dd>
              </div>
              {firstResponseAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-muted-foreground">First response</dt>
                  <dd>{dateFormat.format(new Date(firstResponseAt))}</dd>
                </div>
              )}
              {resolvedAt && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-muted-foreground">Resolved</dt>
                  <dd>{dateFormat.format(new Date(resolvedAt))}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Status history */}
          <section className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              History
            </h2>
            <ol className="grid gap-2 text-xs">
              {statusHistory.map((h) => (
                <li key={h.id} className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {h.fromStatus ? `${h.fromStatus} → ` : ''}{h.toStatus}
                  </span>
                  <span className="text-muted-foreground">
                    {h.changedByName} · {dateFormat.format(new Date(h.changedAt))}
                  </span>
                  {h.note && <span className="text-muted-foreground italic">{h.note}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
