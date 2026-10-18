import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  workflowRulesQuery,
  deleteWorkflowRule,
  enableWorkflowRule,
  disableWorkflowRule,
  refreshWorkflow,
  WORKFLOW_STATUSES,
  eventTypeLabel,
  type WorkflowRule,
} from '@/features/workflow/api'
import { WorkflowStatusBadge } from '@/features/workflow/components/WorkflowStatusBadge'
import { useHasPermission } from '@/features/auth/auth-context'

/** Workflow rules list page: shows all rules with status, trigger, enable/disable controls. */
export function WorkflowRulesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [acting, setActing] = useState<string | null>(null)
  const canManage = useHasPermission('WORKFLOW_MANAGE')
  const queryClient = useQueryClient()
  const result = useQuery(workflowRulesQuery(statusFilter || undefined))

  async function handleToggle(rule: WorkflowRule) {
    setActing(rule.id)
    try {
      if (rule.status === 'ACTIVE') {
        await disableWorkflowRule(rule.id)
      } else {
        await enableWorkflowRule(rule.id)
      }
      await refreshWorkflow(queryClient)
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(rule: WorkflowRule) {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return
    setActing(rule.id)
    try {
      await deleteWorkflowRule(rule.id)
      await refreshWorkflow(queryClient)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Workflow rules"
        description="Automate actions when business events occur."
        action={
          canManage ? (
            <Button asChild>
              <Link to="/admin/workflow-rules/new">New rule</Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border bg-background px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {WORKFLOW_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading workflow rules" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load workflow rules"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="grid gap-4 rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workflow rules found.
              {canManage && (
                <>
                  {' '}
                  <Link to="/admin/workflow-rules/new" className="text-primary underline-offset-2 hover:underline">
                    Create one.
                  </Link>
                </>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Workflow rules</caption>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2 font-medium">Name</th>
                    <th scope="col" className="pb-2 font-medium">Trigger</th>
                    <th scope="col" className="pb-2 font-medium">Status</th>
                    <th scope="col" className="pb-2 font-medium">Updated</th>
                    {canManage ? <th scope="col" className="pb-2 text-right font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((rule) => (
                    <tr key={rule.id} className="border-t align-top">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/admin/workflow-rules/${rule.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {rule.name}
                        </Link>
                        {rule.description ? (
                          <span className="block truncate max-w-[240px] text-xs text-muted-foreground">
                            {rule.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {eventTypeLabel(rule.triggerEventType)}
                      </td>
                      <td className="py-2 pr-3">
                        <WorkflowStatusBadge status={rule.status} />
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(rule.updatedAt).toLocaleDateString()}
                      </td>
                      {canManage ? (
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/admin/workflow-rules/${rule.id}/edit`}>Edit</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting === rule.id}
                              onClick={() => void handleToggle(rule)}
                            >
                              {rule.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting === rule.id}
                              onClick={() => void handleDelete(rule)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
