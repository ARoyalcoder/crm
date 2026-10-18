import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { workforceApi } from '@/features/workforce/api'
import { performanceApi, commissionStatusValues, type CommissionStatus } from '../api'
import { CommissionStatusBadge } from '../components/CommissionStatusBadge'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

export function CommissionRecordsPage() {
  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('')

  const employees = useQuery(workforceApi.listQuery())
  const records = useQuery({
    ...performanceApi.recordsQuery(employeeId, year, month, statusFilter || undefined),
    enabled: Boolean(employeeId),
  })
  const summary = useQuery({
    ...performanceApi.employeeSummaryQuery(employeeId, year, month),
    enabled: Boolean(employeeId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'commissions'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => performanceApi.approveRecord(id),
    onSuccess: invalidate,
  })

  const paidMutation = useMutation({
    mutationFn: (id: string) => performanceApi.markPaidRecord(id),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => performanceApi.cancelRecord(id),
    onSuccess: invalidate,
  })

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  const fmtMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Commission records"
        description="Review, approve and mark commission payments"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          aria-label="Select employee"
        >
          <option value="">Select employee…</option>
          {(employees.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>{e.employeeCode} — {e.designation}</option>
          ))}
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Select month"
        >
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Select year"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {commissionStatusValues.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Summary tiles */}
      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Pending', value: summary.data.pendingTotal, tone: 'yellow' },
            { label: 'Approved', value: summary.data.approvedTotal, tone: 'blue' },
            { label: 'Paid', value: summary.data.paidTotal, tone: 'green' },
            { label: 'Cancelled', value: summary.data.cancelledTotal, tone: 'gray' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-card p-3 shadow-soft">
              <div className="text-xs font-medium text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold tabular-nums">{fmtMoney(Number(value))}</div>
            </div>
          ))}
        </div>
      )}

      {!employeeId && (
        <p className="text-sm text-muted-foreground">Select an employee to see commission records.</p>
      )}

      {employeeId && records.isPending && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}
      {records.isError && <ErrorState title="Could not load commission records" />}

      {records.data && records.data.length === 0 && (
        <p className="text-sm text-muted-foreground">No commission records for these filters.</p>
      )}

      {records.data && records.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Base amount</th>
                <th className="px-4 py-3">Commission</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.data.map((rec) => (
                <tr key={rec.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{rec.sourceType}</span>
                    <br />
                    <span className="font-mono text-xs">{rec.sourceId.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums">{fmtMoney(rec.baseAmount)}</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold">{fmtMoney(rec.commissionAmount)}</td>
                  <td className="px-4 py-3">
                    <CommissionStatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {rec.status === 'PENDING' && (
                        <button
                          className="text-xs text-info hover:underline disabled:opacity-50"
                          onClick={() => approveMutation.mutate(rec.id)}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </button>
                      )}
                      {rec.status === 'APPROVED' && (
                        <button
                          className="text-xs text-success hover:underline disabled:opacity-50"
                          onClick={() => paidMutation.mutate(rec.id)}
                          disabled={paidMutation.isPending}
                        >
                          Mark paid
                        </button>
                      )}
                      {rec.status !== 'PAID' && rec.status !== 'CANCELLED' && (
                        <button
                          className="text-xs text-destructive hover:underline disabled:opacity-50"
                          onClick={() => {
                            if (confirm('Cancel this commission record?')) {
                              cancelMutation.mutate(rec.id)
                            }
                          }}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </button>
                      )}
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
