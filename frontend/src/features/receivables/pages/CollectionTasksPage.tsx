import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  collectionTasksQuery,
  updateCollectionTask,
  refreshReceivables,
  TASK_STATUSES,
  type TaskRow,
} from '@/features/receivables/api'
import { CollectionTaskStatusBadge, CollectionTaskPriorityBadge } from '@/features/receivables/components/CollectionTaskStatusBadge'
import { formatDay } from '@/features/finance/api'
import { useHasPermission } from '@/features/auth/auth-context'

function PaginationBar({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <button
        className="text-primary underline-offset-2 hover:underline disabled:opacity-40"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        ← Previous
      </button>
      <span className="text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <button
        className="text-primary underline-offset-2 hover:underline disabled:opacity-40"
        disabled={page + 1 >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next →
      </button>
    </div>
  )
}

/** Collection tasks (`/receivables/collection-tasks`): list of all tasks with quick status change. */
export function CollectionTasksPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [completing, setCompleting] = useState<string | null>(null)
  const canManage = useHasPermission('RECEIVABLES_MANAGE')
  const queryClient = useQueryClient()
  const result = useQuery(collectionTasksQuery(statusFilter || undefined, page))

  async function handleComplete(task: TaskRow) {
    setCompleting(task.id)
    try {
      await updateCollectionTask(task.id, { status: 'COMPLETED' })
      await refreshReceivables(queryClient)
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Collection tasks"
        description="Follow-up tasks for outstanding and overdue invoices."
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border bg-background px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(0)
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading collection tasks" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load collection tasks"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="grid gap-4 rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collection tasks found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <caption className="sr-only">Collection tasks</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">Invoice / customer</th>
                      <th scope="col" className="pb-2 font-medium">Priority</th>
                      <th scope="col" className="pb-2 font-medium">Status</th>
                      <th scope="col" className="pb-2 font-medium">Due</th>
                      <th scope="col" className="pb-2 font-medium">Notes</th>
                      {canManage ? <th scope="col" className="pb-2 text-right font-medium">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((task: TaskRow) => (
                      <tr key={task.id} className="border-t align-top">
                        <td className="py-2 pr-3">
                          <Link
                            to={`/invoices/${task.invoiceId}`}
                            className="font-mono text-sm font-medium underline-offset-2 hover:underline"
                          >
                            {task.invoiceNumber ?? task.invoiceId.slice(0, 8)}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{task.customerName}</span>
                        </td>
                        <td className="py-2 pr-3">
                          <CollectionTaskPriorityBadge priority={task.priority} />
                        </td>
                        <td className="py-2 pr-3">
                          <CollectionTaskStatusBadge status={task.status} />
                        </td>
                        <td className="py-2 pr-3 text-sm">{formatDay(task.dueDate)}</td>
                        <td className="py-2 pr-3 max-w-[200px]">
                          <span className="block truncate text-xs text-muted-foreground">{task.notes ?? '—'}</span>
                        </td>
                        {canManage ? (
                          <td className="py-2 text-right">
                            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={completing === task.id}
                                onClick={() => void handleComplete(task)}
                              >
                                Complete
                              </Button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalPages={result.data.totalPages} onPage={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
