import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { workforceApi } from '@/features/workforce/api'
import { performanceApi } from '../api'
import { AchievementBadge } from '../components/AchievementBadge'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

export function TeamPerformancePage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [managerId, setManagerId] = useState('')

  const employees = useQuery(workforceApi.listQuery())
  const team = useQuery({
    ...performanceApi.teamPerformanceQuery(managerId, year, month),
    enabled: Boolean(managerId),
  })

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Team performance"
        description="Average target achievement per direct report"
      />

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border px-3 py-2 text-sm bg-background"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          aria-label="Select manager"
        >
          <option value="">Select manager…</option>
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
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {!managerId && (
        <p className="text-sm text-muted-foreground">Select a manager to see their team's performance.</p>
      )}

      {managerId && team.isPending && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {team.isError && <ErrorState title="Could not load team performance" />}

      {team.data && team.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No direct reports for the selected manager, or no targets set for this period.
        </p>
      )}

      {team.data && team.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Targets set</th>
                <th className="px-4 py-3">Avg achievement</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {team.data.map((row) => (
                <tr key={row.employeeId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{row.employeeName}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{row.targetCount}</td>
                  <td className="px-4 py-3">
                    <AchievementBadge pct={Number(row.avgAchievementPct)} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/performance/dashboard?employeeId=${row.employeeId}&year=${year}&month=${month}`}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      View detail
                    </Link>
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
