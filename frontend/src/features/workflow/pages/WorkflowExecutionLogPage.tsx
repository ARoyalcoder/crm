import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { orgExecutionLogQuery, type ExecutionLog } from '@/features/workflow/api'
import { ExecutionStatusBadge } from '@/features/workflow/components/ExecutionStatusBadge'

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
        &larr; Previous
      </button>
      <span className="text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <button
        className="text-primary underline-offset-2 hover:underline disabled:opacity-40"
        disabled={page + 1 >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next &rarr;
      </button>
    </div>
  )
}

/** Parses a JSON result list and counts the items matching `ok`; returns null if the JSON is malformed. */
function summarize<T>(json: string, ok: (item: T) => boolean | undefined): { good: number; total: number } | null {
  try {
    const items = JSON.parse(json) as T[]
    return { good: items.filter((i) => ok(i)).length, total: items.length }
  } catch {
    return null
  }
}

function ResultSummaryCell({ json, suffix, summary }: { json?: string | null; suffix: string; summary: { good: number; total: number } | null }) {
  if (!json) return <span className="text-muted-foreground">—</span>
  if (!summary) {
    return <span className="text-xs text-muted-foreground truncate max-w-[140px] block">{json}</span>
  }
  return (
    <span className="text-xs">
      {summary.good}/{summary.total} {suffix}
    </span>
  )
}

function ConditionsCell({ json }: { json?: string | null }) {
  const summary = json ? summarize<{ passed?: boolean }>(json, (i) => i.passed) : null
  return <ResultSummaryCell json={json} suffix="passed" summary={summary} />
}

function ActionsCell({ json }: { json?: string | null }) {
  const summary = json ? summarize<{ success?: boolean }>(json, (i) => i.success) : null
  return <ResultSummaryCell json={json} suffix="ok" summary={summary} />
}

/** All workflow execution logs across all rules for the organisation. */
export function WorkflowExecutionLogPage() {
  const [page, setPage] = useState(0)
  const result = useQuery(orgExecutionLogQuery(page))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Workflow execution log"
        description="History of all workflow rule evaluations."
        back={{ to: '/admin/workflow-rules', label: 'Workflow rules' }}
      />

      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading execution log" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load execution log"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="grid gap-4 rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No execution records found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <caption className="sr-only">Workflow execution log</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">Rule ID</th>
                      <th scope="col" className="pb-2 font-medium">Status</th>
                      <th scope="col" className="pb-2 font-medium">Conditions</th>
                      <th scope="col" className="pb-2 font-medium">Actions</th>
                      <th scope="col" className="pb-2 font-medium">Error</th>
                      <th scope="col" className="pb-2 font-medium">Executed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((log: ExecutionLog) => (
                      <tr key={log.id} className="border-t align-top">
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                          {log.ruleId.slice(0, 8)}…
                        </td>
                        <td className="py-2 pr-3">
                          <ExecutionStatusBadge status={log.status} />
                        </td>
                        <td className="py-2 pr-3">
                          <ConditionsCell json={log.conditionsResult} />
                        </td>
                        <td className="py-2 pr-3">
                          <ActionsCell json={log.actionsResult} />
                        </td>
                        <td className="py-2 pr-3 max-w-[200px]">
                          {log.errorMessage ? (
                            <span className="block truncate text-xs text-destructive">{log.errorMessage}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
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
