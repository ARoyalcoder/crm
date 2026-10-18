import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarCheck, Plane, UserCheck, UserX, UsersRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { TrendChart } from '@/components/charts/TrendChart'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Select } from '@/components/ui/select'
import { workforceDashboardQuery } from '@/features/analytics/api'
import { chartStateOf } from '@/features/analytics/components/chart-state'
import { DashboardSection } from '@/features/analytics/components/DashboardSection'
import { DashboardToolbar } from '@/features/analytics/components/DashboardToolbar'
import { bucketTick, bucketTitle, compactRupees, periodLabel, kpiGrid } from '@/features/analytics/lib'
import { formatNumber, formatPercent, formatRupees, humanize } from '@/lib/format'
import { useDateRange } from '@/lib/use-date-range'

/** The team: headcount by department, who is in today, how attendance has run, and (for those who may see money) who earned most. */
export function WorkforceDashboardPage() {
  const dateRange = useDateRange()
  const [params, setParams] = useSearchParams()
  const department = params.get('department') ?? undefined
  const query = useQuery({ ...workforceDashboardQuery(dateRange.range, department), placeholderData: keepPreviousData })
  const state = chartStateOf(query)
  const data = query.data
  const period = data?.period
  const granularity = period?.granularity ?? 'DAY'
  const unit = granularity === 'MONTH' ? 'month' : granularity === 'WEEK' ? 'week' : 'day'

  if (query.isError && !data) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Workforce" description="Headcount, attendance and earnings." />
        <ErrorState title="Could not load the workforce dashboard" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const departments = data?.byDepartment ?? []
  const attendance = (data?.attendanceTrend ?? []).map((p) => ({ bucket: p.bucket, rate: p.ratePct, records: p.records }))
  const hasAttendance = attendance.some((p) => p.rate !== null)
  // With nobody marked present, on leave or absent, today has simply not been recorded yet: say so instead of showing zeros.
  const recordedToday = data ? data.presentToday + data.onLeaveToday + data.absentToday > 0 || data.totalEmployees === 0 : true
  const notRecorded = 'Not recorded yet today'

  return (
    <div className="grid gap-5 min-w-0 w-full">
      <div className="grid gap-4 min-w-0">
        <PageHeader title="Workforce" description="Team size, who is in today, and attendance." />
        <DashboardToolbar dateRange={dateRange} period={period}>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Department</span>
            <Select
              aria-label="Department"
              className="w-48"
              value={department ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(params)
                if (event.target.value) next.set('department', event.target.value)
                else next.delete('department')
                setParams(next, { replace: true })
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.department ?? 'none'} value={d.department ?? ''} disabled={!d.department}>
                  {d.department ? humanize(d.department) : 'No department'}
                </option>
              ))}
            </Select>
          </label>
        </DashboardToolbar>
      </div>

      <DashboardSection title="At a glance" description="Headcount and today's attendance; average over the period.">
        <div className={kpiGrid(5)}>
          <StatCard label="Active employees" icon={UsersRound} loading={query.isPending} value={formatNumber(data?.totalEmployees)} hint={department ? `In ${humanize(department)}` : 'Across all departments'} href="/workforce/employees" />
          <StatCard label="Present today" icon={UserCheck} tone="success" loading={query.isPending} value={recordedToday ? formatNumber(data?.presentToday) : '—'} hint={recordedToday ? 'Present, half day or working from home' : notRecorded} />
          <StatCard label="On leave today" icon={Plane} tone="info" loading={query.isPending} value={recordedToday ? formatNumber(data?.onLeaveToday) : '—'} hint={recordedToday ? 'Approved leave' : notRecorded} />
          <StatCard
            label="Absent today"
            icon={UserX}
            tone={data && data.absentToday > 0 ? 'danger' : recordedToday ? 'success' : 'neutral'}
            loading={query.isPending}
            value={recordedToday ? formatNumber(data?.absentToday) : '—'}
            hint={recordedToday ? 'Marked absent' : notRecorded}
          />
          <StatCard
            label="Average attendance"
            icon={CalendarCheck}
            tone="primary"
            loading={query.isPending}
            value={formatPercent(data?.avgAttendanceRate)}
            hint={data && data.avgAttendanceRate === null ? 'No attendance recorded in this period' : 'Present out of present plus absent; leave and holidays are excluded'}
            href="/workforce/attendance"
          />
        </div>
      </DashboardSection>

      <div className="grid gap-4 lg:grid-cols-3 min-w-0">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            title="Attendance"
            description={period ? `Share of recorded days present, ${periodLabel(period)}` : undefined}
            table={{
              caption: `Attendance rate per ${unit}`,
              columns: [
                { key: 'bucket', label: granularity === 'MONTH' ? 'Month' : granularity === 'WEEK' ? 'Week of' : 'Day' },
                { key: 'rate', label: 'Present', align: 'right' },
                { key: 'records', label: 'Records', align: 'right' },
              ],
              rows: attendance.filter((p) => p.rate !== null).map((p) => ({ bucket: bucketTitle(granularity, p.bucket), rate: formatPercent(p.rate), records: formatNumber(p.records) })),
            }}
            empty={data && !hasAttendance ? { title: 'No attendance recorded in this period', description: 'Attendance marked on the Attendance page appears here.' } : false}
            footer="Days without recorded attendance are excluded, not counted as zero."
            {...state}
          >
            <TrendChart
              data={attendance.map((p) => ({ bucket: p.bucket, rate: p.rate }))}
              xKey="bucket"
              xFormat={(value) => bucketTick(granularity, value)}
              tooltipTitle={(value) => bucketTitle(granularity, value)}
              yFormat={(value) => `${value}%`}
              series={[{ key: 'rate', name: 'Present', kind: 'area', format: (v) => formatPercent(v) }]}
              description={`Percentage of recorded working days people were present, per ${unit}.`}
            />
          </ChartCard>
        </div>
        <div className="min-w-0">
          <ChartCard
            title="Team by department"
            table={{
              caption: 'Active employees by department',
              columns: [
                { key: 'department', label: 'Department' },
                { key: 'employees', label: 'Employees', align: 'right' },
              ],
              rows: departments.map((d) => ({ department: d.department ? humanize(d.department) : 'No department', employees: formatNumber(d.employees) })),
            }}
            empty={data && departments.length === 0 ? { title: 'No employees yet', description: 'Employee profiles appear here by department.' } : false}
            drillDown={{ to: '/workforce/employees', label: 'View employees' }}
            {...state}
          >
            <BarsChart
              orientation="bars"
              data={departments.map((d) => ({ label: d.department ? humanize(d.department) : 'No department', employees: d.employees }))}
              series={[{ key: 'employees', name: 'Employees' }]}
              tipLabels
              description="Number of active employees in each department."
            />
          </ChartCard>
        </div>
      </div>

      {data?.topPerformers ? (
        <ChartCard
          title="Top earners"
          description={period ? `Approved and paid commission, ${periodLabel(period)}` : undefined}
          table={{
            caption: 'Top approved or paid commission earners in the period',
            columns: [
              { key: 'name', label: 'Employee' },
              { key: 'amount', label: 'Commission', align: 'right' },
            ],
            rows: data.topPerformers.map((p) => ({ name: p.name ?? 'Unknown', amount: formatRupees(p.commissionAmount) })),
          }}
          empty={data.topPerformers.length === 0 ? { title: 'No commission approved in this period' } : false}
          drillDown={{ to: '/performance/commissions', label: 'View commissions' }}
          {...state}
        >
          <BarsChart
            orientation="bars"
            data={data.topPerformers.map((p) => ({ label: p.name ?? 'Unknown', amount: p.commissionAmount }))}
            series={[{ key: 'amount', name: 'Commission', format: (v) => formatRupees(v) }]}
            valueFormat={compactRupees}
            tipLabels
            description="Approved and paid commission for the top earners in the period."
          />
        </ChartCard>
      ) : null}
    </div>
  )
}
