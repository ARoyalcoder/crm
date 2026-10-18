import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import {
  workflowRuleQuery,
  createWorkflowRule,
  updateWorkflowRule,
  BUSINESS_EVENT_TYPES,
  CONDITION_OPERATORS,
  ACTION_TYPES,
  WORKFLOW_STATUSES,
  type SaveRuleInput,
} from '@/features/workflow/api'

type ConditionRow = { field: string; operator: string; value: string }
type ActionRow = { actionType: string; params: string }

const EMPTY_CONDITION: ConditionRow = { field: '', operator: 'EQUALS', value: '' }
const EMPTY_ACTION: ActionRow = { actionType: 'LOG_ONLY', params: '{}' }

function parseConditions(json?: string | null): ConditionRow[] {
  if (!json || json === '[]') return []
  try {
    const arr = JSON.parse(json) as Array<Record<string, string>>
    return arr.map((c) => ({ field: c.field ?? '', operator: c.operator ?? 'EQUALS', value: c.value ?? '' }))
  } catch {
    return []
  }
}

function parseActions(json?: string | null): ActionRow[] {
  if (!json || json === '[]') return [{ ...EMPTY_ACTION }]
  try {
    const arr = JSON.parse(json) as Array<Record<string, unknown>>
    return arr.map((a) => ({
      actionType: (a.actionType as string) ?? 'LOG_ONLY',
      params: JSON.stringify(a.params ?? {}),
    }))
  } catch {
    return [{ ...EMPTY_ACTION }]
  }
}

function buildConditionsJson(rows: ConditionRow[]): string {
  const active = rows.filter((r) => r.field.trim())
  if (active.length === 0) return '[]'
  return JSON.stringify(active.map((r) => ({ field: r.field, operator: r.operator, value: r.value })))
}

function buildActionsJson(rows: ActionRow[]): string {
  return JSON.stringify(
    rows.map((r) => {
      let params: Record<string, unknown> = {}
      try { params = JSON.parse(r.params) } catch { /* ignore */ }
      return { actionType: r.actionType, params }
    }),
  )
}

/** Rule builder form used for both create and edit. */
export function WorkflowRuleFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)

  const ruleResult = useQuery({ ...workflowRuleQuery(id!), enabled: isEdit })

  const initialRule = isEdit ? ruleResult.data : undefined

  const [name, setName] = useState(initialRule?.name ?? '')
  const [description, setDescription] = useState(initialRule?.description ?? '')
  const [status, setStatus] = useState(initialRule?.status ?? 'DRAFT')
  const [triggerEventType, setTriggerEventType] = useState(
    initialRule?.triggerEventType ?? BUSINESS_EVENT_TYPES[0].value,
  )
  const [conditions, setConditions] = useState<ConditionRow[]>(
    parseConditions(initialRule?.conditions),
  )
  const [actions, setActions] = useState<ActionRow[]>(
    parseActions(initialRule?.actions),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-initialise form when edit data loads
  if (isEdit && ruleResult.data && name === '' && ruleResult.data.name) {
    setName(ruleResult.data.name)
    setDescription(ruleResult.data.description ?? '')
    setStatus(ruleResult.data.status)
    setTriggerEventType(ruleResult.data.triggerEventType)
    setConditions(parseConditions(ruleResult.data.conditions))
    setActions(parseActions(ruleResult.data.actions))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const input: SaveRuleInput = {
        name,
        description: description || null,
        status,
        triggerEventType,
        conditions: buildConditionsJson(conditions),
        actions: buildActionsJson(actions),
      }
      if (isEdit && id) {
        await updateWorkflowRule(id, input)
      } else {
        await createWorkflowRule(input)
      }
      navigate('/admin/workflow-rules')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function addCondition() {
    setConditions((prev) => [...prev, { ...EMPTY_CONDITION }])
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCondition(index: number, field: keyof ConditionRow, value: string) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function addAction() {
    setActions((prev) => [...prev, { ...EMPTY_ACTION }])
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAction(index: number, field: keyof ActionRow, value: string) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  if (isEdit && ruleResult.isPending) {
    return <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading rule" />
  }
  if (isEdit && ruleResult.isError) {
    return (
      <ErrorState
        title="Could not load rule"
        error={ruleResult.error}
        onRetry={() => void ruleResult.refetch()}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEdit ? 'Edit workflow rule' : 'New workflow rule'}
        description="Define trigger, conditions, and actions."
        back={{ to: '/admin/workflow-rules', label: 'Workflow rules' }}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
        {/* Basic info */}
        <section className="rounded-xl bg-card p-3.5 shadow-soft grid gap-4">
          <h2 className="text-sm font-semibold">Basic information</h2>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="rule-name">Name *</label>
            <input
              id="rule-name"
              required
              maxLength={255}
              className="rounded-xl border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="rule-description">Description</label>
            <textarea
              id="rule-description"
              rows={2}
              className="rounded-xl border bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="rule-status">Status</label>
            <select
              id="rule-status"
              className="rounded-xl border bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {WORKFLOW_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Trigger */}
        <section className="rounded-xl bg-card p-3.5 shadow-soft grid gap-4">
          <h2 className="text-sm font-semibold">Trigger event</h2>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="rule-trigger">Event type *</label>
            <select
              id="rule-trigger"
              required
              className="rounded-xl border bg-background px-3 py-2 text-sm"
              value={triggerEventType}
              onChange={(e) => setTriggerEventType(e.target.value)}
            >
              {BUSINESS_EVENT_TYPES.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Conditions */}
        <section className="rounded-xl bg-card p-3.5 shadow-soft grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Conditions</h2>
            <Button type="button" size="sm" variant="outline" onClick={addCondition}>
              + Add condition
            </Button>
          </div>
          {conditions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No conditions: the rule runs on every matching event.
            </p>
          ) : (
            <div className="grid gap-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    placeholder="Field name"
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm flex-1 min-w-[120px]"
                    value={cond.field}
                    onChange={(e) => updateCondition(i, 'field', e.target.value)}
                  />
                  <select
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                    value={cond.operator}
                    onChange={(e) => updateCondition(i, 'operator', e.target.value)}
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Value"
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm flex-1 min-w-[100px]"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, 'value', e.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => removeCondition(i)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="rounded-xl bg-card p-3.5 shadow-soft grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Actions</h2>
            <Button type="button" size="sm" variant="outline" onClick={addAction}>
              + Add action
            </Button>
          </div>
          {actions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Add at least one action.</p>
          ) : (
            <div className="grid gap-3">
              {actions.map((action, i) => (
                <div key={i} className="grid gap-2 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Action type</label>
                    <Button type="button" size="sm" variant="outline" onClick={() => removeAction(i)}>
                      Remove
                    </Button>
                  </div>
                  <select
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                    value={action.actionType}
                    onChange={(e) => updateAction(i, 'actionType', e.target.value)}
                  >
                    {ACTION_TYPES.map((at) => (
                      <option key={at.value} value={at.value}>{at.label}</option>
                    ))}
                  </select>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Parameters (JSON object)
                    </label>
                    <textarea
                      rows={3}
                      className="rounded-xl border bg-background px-3 py-2 font-mono text-xs"
                      placeholder='{"title": "Follow up", "priority": "HIGH"}'
                      value={action.params}
                      onChange={(e) => updateAction(i, 'params', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/workflow-rules')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </div>
      </form>
    </div>
  )
}
