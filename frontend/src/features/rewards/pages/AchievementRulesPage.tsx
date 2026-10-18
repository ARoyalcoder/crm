import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  achievementRulesQuery,
  deleteAchievementRule,
  toggleAchievementRule,
  createAchievementRule,
  updateAchievementRule,
  refreshRewards,
  ACHIEVEMENT_CATEGORIES,
  BADGE_LEVELS,
  categoryLabel,
  type AchievementRule,
  type SaveAchievementRuleInput,
} from '@/features/rewards/api'
import { BadgeLevelBadge } from '@/features/rewards/components/BadgeLevelBadge'
import { useHasPermission } from '@/features/auth/auth-context'

const EMPTY_FORM: SaveAchievementRuleInput = {
  name: '',
  description: '',
  category: 'FIRST_MILESTONE',
  triggerEventType: '',
  triggerThreshold: null,
  employeePoints: 0,
  badgeLevel: null,
}

/** Admin page to configure achievement rules. */
export function AchievementRulesPage() {
  const canManage = useHasPermission('REWARDS_MANAGE')
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<string>('')
  const [acting, setActing] = useState<string | null>(null)
  const [editing, setEditing] = useState<AchievementRule | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<SaveAchievementRuleInput>(EMPTY_FORM)

  const active = activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined
  const result = useQuery(achievementRulesQuery(active))

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setCreating(true)
  }

  function openEdit(rule: AchievementRule) {
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      category: rule.category,
      triggerEventType: rule.triggerEventType,
      triggerThreshold: rule.triggerThreshold ?? null,
      employeePoints: rule.employeePoints,
      badgeLevel: rule.badgeLevel ?? null,
    })
    setEditing(rule)
    setCreating(false)
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateAchievementRule(editing.id, form)
      } else {
        await createAchievementRule(form)
      }
      await refreshRewards(queryClient)
      closeForm()
    } catch {
      // errors surface as thrown; a toast layer above would handle these
    }
  }

  async function handleToggle(rule: AchievementRule) {
    setActing(rule.id)
    try {
      await toggleAchievementRule(rule.id)
      await refreshRewards(queryClient)
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(rule: AchievementRule) {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return
    setActing(rule.id)
    try {
      await deleteAchievementRule(rule.id)
      await refreshRewards(queryClient)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Achievement rules"
        description="Choose which business events earn employees achievements and badges."
        action={
          canManage ? (
            <Button onClick={openCreate}>New rule</Button>
          ) : undefined
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          className="rounded-xl border bg-background px-3 py-1.5 text-sm"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          aria-label="Filter by active status"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Inline form */}
      {(creating || editing) && (
        <div className="rounded-xl border bg-card p-3.5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">
            {editing ? 'Edit rule' : 'New achievement rule'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Trigger event type</label>
              <input
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                placeholder="e.g. ORDER_CREATED"
                value={form.triggerEventType}
                onChange={(e) => setForm((f) => ({ ...f, triggerEventType: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {ACHIEVEMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Badge level</label>
              <select
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                value={form.badgeLevel ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, badgeLevel: e.target.value || null }))}
              >
                <option value="">None</option>
                {BADGE_LEVELS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                Threshold (for count milestones)
              </label>
              <input
                type="number"
                min={1}
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                placeholder="Leave blank for first-event rules"
                value={form.triggerThreshold ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    triggerThreshold: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Employee points</label>
              <input
                type="number"
                min={0}
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                value={form.employeePoints}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employeePoints: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                rows={2}
                className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => void handleSave()}>Save</Button>
            <Button size="sm" variant="outline" onClick={closeForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading achievement rules" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load achievement rules"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="grid gap-4 rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No achievement rules found.{' '}
              {canManage && (
                <button
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={openCreate}
                >
                  Create one.
                </button>
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <caption className="sr-only">Achievement rules</caption>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2 font-medium">Name</th>
                    <th scope="col" className="pb-2 font-medium">Event</th>
                    <th scope="col" className="pb-2 font-medium">Category</th>
                    <th scope="col" className="pb-2 font-medium">Threshold</th>
                    <th scope="col" className="pb-2 font-medium">Points</th>
                    <th scope="col" className="pb-2 font-medium">Badge</th>
                    <th scope="col" className="pb-2 font-medium">Status</th>
                    {canManage ? <th scope="col" className="pb-2 text-right font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((rule) => (
                    <tr key={rule.id} className="border-t align-top">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{rule.name}</span>
                        {rule.description ? (
                          <span className="block truncate max-w-[200px] text-xs text-muted-foreground">
                            {rule.description}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {rule.triggerEventType}
                      </td>
                      <td className="py-2 pr-3 text-xs">{categoryLabel(rule.category)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {rule.triggerThreshold ?? '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{rule.employeePoints}</td>
                      <td className="py-2 pr-3">
                        <BadgeLevelBadge level={rule.badgeLevel} />
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            rule.active
                              ? 'bg-success-soft text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {rule.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(rule)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={acting === rule.id}
                              onClick={() => void handleToggle(rule)}
                            >
                              {rule.active ? 'Disable' : 'Enable'}
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
