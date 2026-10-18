import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createSla,
  deleteSla,
  slaKeys,
  slasQuery,
  TICKET_PRIORITIES,
  updateSla,
  type Sla,
  type SlaInput,
} from '@/features/support/api'

const emptyForm = (): SlaInput => ({
  name: '',
  responseTimeHours: 4,
  resolutionTimeHours: 24,
  priority: 'MEDIUM',
  active: true,
})

/** Admin page for managing SLA definitions. */
export function SlaConfigPage() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SlaInput>(emptyForm())

  const { data: slas, isPending, isError, error, refetch } = useQuery(slasQuery)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: slaKeys.all })

  const createMutation = useMutation({
    mutationFn: () => createSla(form),
    onSuccess: () => { setShowForm(false); setForm(emptyForm()); void invalidate() },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateSla(editingId!, form),
    onSuccess: () => { setEditingId(null); setForm(emptyForm()); void invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSla(id),
    onSuccess: () => void invalidate(),
  })

  function startEdit(sla: Sla) {
    setEditingId(sla.id)
    setShowForm(false)
    setForm({
      name: sla.name,
      responseTimeHours: sla.responseTimeHours,
      resolutionTimeHours: sla.resolutionTimeHours,
      priority: sla.priority,
      active: sla.active,
    })
  }

  function cancelForm() {
    setEditingId(null)
    setShowForm(false)
    setForm(emptyForm())
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const canSubmit = form.name.trim() && form.responseTimeHours > 0 && form.resolutionTimeHours > 0

  return (
    <div className="grid gap-4">
      <PageHeader
        title="SLA definitions"
        description="Response and resolution time targets per priority level."
        action={
          !showForm && !editingId ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" />
              New SLA
            </Button>
          ) : null
        }
      />

      {/* Form */}
      {(showForm || editingId) && (
        <form
          className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-4 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault()
            if (editingId) updateMutation.mutate()
            else createMutation.mutate()
          }}
        >
          <h2 className="text-sm font-semibold">{editingId ? 'Edit SLA' : 'New SLA'}</h2>

          <div className="grid gap-2">
            <Label htmlFor="slaName">Name *</Label>
            <Input
              id="slaName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Standard Business Hours"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="responseHours">First response (hours) *</Label>
              <Input
                id="responseHours"
                type="number"
                min={1}
                value={form.responseTimeHours}
                onChange={(e) => setForm({ ...form, responseTimeHours: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resolutionHours">Resolution (hours) *</Label>
              <Input
                id="resolutionHours"
                type="number"
                min={1}
                value={form.resolutionTimeHours}
                onChange={(e) => setForm({ ...form, resolutionTimeHours: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="slaPriority">Priority</Label>
              <select
                id="slaPriority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 content-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-destructive">Save failed. Try again.</p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" aria-busy="true" />
      ) : isError ? (
        <ErrorState title="Could not load SLA definitions" error={error} onRetry={() => void refetch()} />
      ) : (slas ?? []).length === 0 ? (
        <p className="rounded-xl bg-card p-4 text-center text-sm text-muted-foreground shadow-soft">
          No SLA definitions yet. Create one to start tracking deadlines.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">First response</th>
                <th className="px-4 py-3 font-medium">Resolution</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(slas ?? []).map((sla) => (
                <tr key={sla.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium">{sla.name}</td>
                  <td className="px-4 py-3">{sla.priority}</td>
                  <td className="px-4 py-3">{sla.responseTimeHours}h</td>
                  <td className="px-4 py-3">{sla.resolutionTimeHours}h</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        sla.active
                          ? 'bg-success-soft text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {sla.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${sla.name}`}
                        onClick={() => startEdit(sla)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${sla.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete SLA "${sla.name}"?`)) {
                            deleteMutation.mutate(sla.id)
                          }
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
