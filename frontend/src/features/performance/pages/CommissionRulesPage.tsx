import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { performanceApi, commissionTypeValues, type CommissionRule, type CommissionType } from '../api'

const EMPTY_FORM = {
  name: '',
  serviceId: '',
  eligibleRoleCode: '',
  commissionType: 'PERCENTAGE' as CommissionType,
  value: '',
  minOrderValue: '',
  active: true,
}

export function CommissionRulesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const rules = useQuery(performanceApi.rulesQuery())

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['commission-rules'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      performanceApi.createRule({
        name: form.name,
        serviceId: form.serviceId || undefined,
        eligibleRoleCode: form.eligibleRoleCode || undefined,
        commissionType: form.commissionType,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        active: form.active,
      }),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      performanceApi.updateRule(id, {
        name: form.name,
        serviceId: form.serviceId || undefined,
        eligibleRoleCode: form.eligibleRoleCode || undefined,
        commissionType: form.commissionType,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        active: form.active,
      }),
    onSuccess: () => {
      invalidate()
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => performanceApi.deleteRule(id),
    onSuccess: () => invalidate(),
  })

  const startEdit = (rule: CommissionRule) => {
    setEditingId(rule.id)
    setForm({
      name: rule.name,
      serviceId: rule.serviceId ?? '',
      eligibleRoleCode: rule.eligibleRoleCode ?? '',
      commissionType: rule.commissionType,
      value: String(rule.value),
      minOrderValue: rule.minOrderValue != null ? String(rule.minOrderValue) : '',
      active: rule.active,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate(editingId)
    } else {
      createMutation.mutate()
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Commission rules"
        description="How commission is calculated, per service and role"
        action={
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
          >
            New rule
          </button>
        }
      />

      {showForm && (
        <div className="rounded-xl border bg-card p-3.5 shadow-soft">
          <h2 className="mb-4 text-sm font-semibold">{editingId ? 'Edit rule' : 'New commission rule'}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Rule name *</label>
              <input
                required
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Commission type *</label>
              <select
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={form.commissionType}
                onChange={(e) => setForm({ ...form, commissionType: e.target.value as CommissionType })}
              >
                {commissionTypeValues.map((t) => (
                  <option key={t} value={t}>{t === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed amount'}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {form.commissionType === 'PERCENTAGE' ? 'Rate (%)' : 'Fixed amount (₹)'} *
              </label>
              <input
                required
                type="number"
                step="0.0001"
                min="0.0001"
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Min order value (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                placeholder="No minimum"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Eligible role code</label>
              <input
                className="rounded-md border px-3 py-2 text-sm bg-background"
                value={form.eligibleRoleCode}
                onChange={(e) => setForm({ ...form, eligibleRoleCode: e.target.value })}
                placeholder="e.g. SALES_MANAGER (blank = all roles)"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-muted-foreground">Service ID (optional)</label>
              <input
                className="rounded-md border px-3 py-2 text-sm bg-background font-mono text-xs"
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                placeholder="UUID (blank = all services)"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <label htmlFor="active" className="text-sm cursor-pointer">Active</label>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {editingId ? 'Save changes' : 'Create rule'}
              </button>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {rules.isPending && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}
      {rules.isError && <ErrorState title="Could not load commission rules" />}

      {rules.data && rules.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No commission rules yet.</p>
      )}

      {rules.data && rules.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Min order</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.data.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-sm">{rule.commissionType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">
                    {rule.commissionType === 'PERCENTAGE' ? `${rule.value}%` : `₹${rule.value}`}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                    {rule.minOrderValue != null ? `₹${rule.minOrderValue}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {rule.eligibleRoleCode ?? 'All roles'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rule.active ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => startEdit(rule)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-destructive hover:underline"
                        onClick={() => {
                          if (confirm('Delete this commission rule?')) {
                            deleteMutation.mutate(rule.id)
                          }
                        }}
                      >
                        Delete
                      </button>
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
