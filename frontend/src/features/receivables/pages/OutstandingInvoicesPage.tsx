import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { outstandingQuery, createCollectionTask, refreshReceivables, type InvoiceRow } from '@/features/receivables/api'
import { AgeingBucketBadge } from '@/features/receivables/components/AgeingBucketBadge'
import { formatDay, formatMoney } from '@/features/finance/api'
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

function InvoiceRow({
  row,
  canManage,
  onCreateTask,
  creating,
}: {
  row: InvoiceRow
  canManage: boolean
  onCreateTask: (invoiceId: string) => void
  creating: string | null
}) {
  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-3">
        <Link to={`/invoices/${row.id}`} className="font-mono text-sm font-medium underline-offset-2 hover:underline">
          {row.invoiceNumber ?? 'Draft'}
        </Link>
        <span className="block text-xs text-muted-foreground">{row.customerName}</span>
      </td>
      <td className="py-2 pr-3 text-sm">{formatDay(row.dueDate)}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-sm">{formatMoney(row.outstanding)}</td>
      <td className="py-2 pr-3">
        <AgeingBucketBadge daysOverdue={row.daysOverdue} />
      </td>
      {canManage ? (
        <td className="py-2 text-right">
          <Button
            size="sm"
            variant="outline"
            disabled={creating === row.id}
            onClick={() => onCreateTask(row.id)}
          >
            <Plus className="mr-1 size-3" />
            Task
          </Button>
        </td>
      ) : null}
    </tr>
  )
}

/** Outstanding invoices (`/receivables/outstanding`): ISSUED and PARTIALLY_PAID. */
export function OutstandingInvoicesPage() {
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState<string | null>(null)
  const canManage = useHasPermission('RECEIVABLES_MANAGE')
  const queryClient = useQueryClient()
  const result = useQuery(outstandingQuery(page))

  async function handleCreateTask(invoiceId: string) {
    setCreating(invoiceId)
    try {
      await createCollectionTask({ invoiceId, priority: 'MEDIUM' })
      await refreshReceivables(queryClient)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Outstanding invoices"
        description="Issued and partly paid invoices, by due date."
      />
      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading outstanding invoices" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load outstanding invoices"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="grid gap-4 rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding invoices.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <caption className="sr-only">Outstanding invoices</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">Invoice / customer</th>
                      <th scope="col" className="pb-2 font-medium">Due date</th>
                      <th scope="col" className="pb-2 text-right font-medium">Outstanding</th>
                      <th scope="col" className="pb-2 font-medium">Age</th>
                      {canManage ? <th scope="col" className="pb-2 text-right font-medium">Action</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((row) => (
                      <InvoiceRow
                        key={row.id}
                        row={row}
                        canManage={canManage}
                        onCreateTask={handleCreateTask}
                        creating={creating}
                      />
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
