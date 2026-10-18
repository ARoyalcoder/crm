import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { workforceApi } from '@/features/workforce/api'
import { performanceApi, targetTypeLabels, type PerformanceSummary } from '../api'
import { AchievementBadge } from '../components/AchievementBadge'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

function formatValue(summary: PerformanceSummary): { target: string; actual: string } {
  const isCount = summary.targetType === 'FOLLOW_UP_COUNT'
    || summary.targetType === 'ORDER_COUNT'
    || summary.targetType === 'PROJECT_COMPLETION'
  const fmt = (n: number) =>
    isCount ? n.toFixed(0) : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return { target: fmt(summary.targetValue), actual: fmt(summary.actual) }
}

export function PerformanceDashboardPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [employeeId, setEmployeeId] = useState('')

  const employees = useQuery(workforceApi.listQuery())
  const summary = useQuery({
    ...performanceApi.summaryQuery(employeeId, year, month),
    enabled: Boolean(employeeId),
  })

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Performance dashboard"
        description="Target vs. actual achievement by employee and month"
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
            <option key={e.id} value={e.id}>
              {e.employeeCode} — {e.designation}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Select month"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Select year"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {!employeeId && (
        <p className="text-sm text-muted-foreground">Select an employee to see their performance.</p>
      )}

      {employeeId && summary.isPending && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {summary.isError && <ErrorState title="Could not load performance summary" />}

      {summary.data && summary.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No performance targets set for this employee in {months[month - 1]?.label} {year}.
        </p>
      )}

      {summary.data && summary.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3 pr-4">Metric</th>
                <th className="px-4 py-3 pr-4">Target</th>
                <th className="px-4 py-3 pr-4">Actual</th>
                <th className="px-4 py-3 pr-4">Achievement</th>
                <th className="px-4 py-3">Remaining / over</th>
              </tr>
            </thead>
            <tbody className="px-4">
              {summary.data.map((row) => (
                <tr key={row.targetType} className="border-b px-4 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{targetTypeLabels[row.targetType]}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatValue(row).target}</td>
                  <td className="px-4 py-3 text-sm tabular-nums">{formatValue(row).actual}</td>
                  <td className="px-4 py-3">
                    <AchievementBadge pct={Number(row.achievementPct)} />
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                    {row.overachieved ? (
                      <span className="text-success">+{Number(row.overachievementAmount).toLocaleString()} over</span>
                    ) : (
                      <span>{Number(row.remaining).toLocaleString()} remaining</span>
                    )}
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
