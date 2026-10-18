import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/features/auth/auth-context'
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ticketsQuery,
  type TicketFilters,
} from '@/features/support/api'
import { SlaTimer } from '@/features/support/components/SlaTimer'
import { TicketPriorityBadge } from '@/features/support/components/TicketPriorityBadge'
import { TicketStatusBadge } from '@/features/support/components/TicketStatusBadge'
import { useListParams } from '@/lib/use-list-params'

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** All support tickets for the organisation. */
export function TicketsPage() {
  const params = useListParams()
  const hasCreate = useHasPermission('TICKET_CREATE')
  const hasManage = useHasPermission('TICKET_MANAGE')
  const canCreate = hasCreate || hasManage

  const filters: TicketFilters = {
    search: params.get('search'),
    status: params.get('status'),
    priority: params.get('priority'),
    page: params.page,
  }
  const { data, isPending, isError, error, refetch } = useQuery(ticketsQuery(filters))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Support tickets"
        description="Customer support requests, tracked from opening to resolution."
        action={
          canCreate ? (
            <Button asChild>
              <Link to="/support/tickets/new">
                <Plus aria-hidden="true" />
                New ticket
              </Link>
            </Button>
          ) : null
        }
      />

      <ListToolbar>
        <SearchInput
          label="Search tickets"
          value={params.get('search')}
          onChange={(value) => params.set('search', value)}
        />
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={params.get('status')}
          onChange={(value) => params.set('status', value)}
          options={[...TICKET_STATUSES]}
        />
        <FilterSelect
          label="Priority"
          allLabel="Any priority"
          value={params.get('priority')}
          onChange={(value) => params.set('priority', value)}
          options={[...TICKET_PRIORITIES]}
        />
      </ListToolbar>

      {isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" aria-busy="true" aria-label="Loading tickets" />
      ) : isError ? (
        <ErrorState title="Could not load tickets" error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-center text-sm text-muted-foreground shadow-soft">
          No tickets match.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned to</th>
                  <th className="px-4 py-3 font-medium">SLA</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/support/tickets/${ticket.id}`}
                        className="font-mono text-xs font-medium text-primary hover:underline"
                      >
                        {ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <Link
                        to={`/support/tickets/${ticket.id}`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ticket.customerName}</td>
                    <td className="px-4 py-3">
                      <TicketPriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ticket.assignedUserName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <SlaTimer
                        dueAt={ticket.dueAt}
                        slaBreachStatus={ticket.slaBreachStatus}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {dateFormat.format(new Date(ticket.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalItems={data.totalItems}
            noun="tickets"
            singular="ticket"
            onPageChange={params.setPage}
          />
        </>
      )}
    </div>
  )
}
