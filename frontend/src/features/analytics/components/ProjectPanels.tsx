import { CircleCheck, Clock3, FolderKanban, Timer, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { ordinalColors, seriesColor, statusColor } from '@/components/charts/colors'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { DeliveryRow, MilestoneRow, Period, ProjectsOverview } from '@/features/analytics/api'
import type { ChartState } from '@/features/analytics/components/chart-state'
import { bucketTick, bucketTitle, compactRupees, periodLabel, trendOf } from '@/features/analytics/lib'
import { TrendChart } from '@/components/charts/TrendChart'
import { formatDate, formatNumber, formatPercent, formatRupees } from '@/lib/format'

type Panel = { projects?: ProjectsOverview; period?: Period; state: ChartState }

export function ProjectKpis({ projects, period, loading }: { projects?: ProjectsOverview; period?: Period; loading?: boolean }) {
  return (
    <>
      <StatCard
        label="Active projects"
        icon={FolderKanban}
        loading={loading}
        value={formatNumber(projects?.active)}
        hint="Running now"
        href="/projects"
      />
      <StatCard
        label="Delayed"
        icon={TriangleAlert}
        tone={projects && projects.delayed > 0 ? 'danger' : 'success'}
        loading={loading}
        value={formatNumber(projects?.delayed)}
        hint={projects && projects.delayed > 0 ? 'Past the expected date and not finished' : 'Nothing is behind schedule'}
        href="/projects"
      />
      <StatCard
        label="Completed"
        icon={CircleCheck}
        tone="success"
        loading={loading}
        value={formatNumber(projects?.completed.value)}
        trend={trendOf(projects?.completed, period)}
        hint="Finished in the period"
        href="/projects"
      />
      <StatCard
        label="Finished on time"
        icon={Timer}
        tone="info"
        loading={loading}
        value={formatPercent(projects?.onTimePct, 0)}
        hint={
          projects?.onTimePct === null
            ? 'No projects finished in this period'
            : projects?.avgDurationDays != null
              ? `Average ${formatNumber(projects.avgDurationDays)} days start to finish`
              : undefined
        }
      />
    </>
  )
}

export function ProjectStatusCard({ projects, state }: Omit<Panel, 'period'>) {
  const statuses = projects?.byStatus ?? []
  const colors = ordinalColors(statuses.length)
  const total = statuses.reduce((sum, s) => sum + s.count, 0)
  return (
    <ChartCard
      title="Projects by status"
      description={projects ? `${formatNumber(total)} projects in all` : undefined}
      table={{
        caption: 'Projects per status',
        columns: [
          { key: 'status', label: 'Status' },
          { key: 'count', label: 'Projects', align: 'right' },
        ],
        rows: statuses.map((s) => ({ status: s.name, count: formatNumber(s.count) })),
      }}
      empty={projects && total === 0 ? { title: 'No projects yet', description: 'Projects created from orders appear here, with status.' } : false}
      drillDown={{ to: '/projects', label: 'View projects' }}
      footer="In project workflow order. Finished and cancelled statuses come from your project status settings."
      {...state}
    >
      <BarsChart
        orientation="bars"
        data={statuses.map((s) => ({ label: s.name, count: s.count }))}
        series={[{ key: 'count', name: 'Projects' }]}
        colorBy={(_, index) => colors[index] ?? seriesColor(0)}
        tipLabels
        description="Projects per status, in workflow order."
      />
    </ChartCard>
  )
}

const delayedColumn = dataTableColumns<ProjectsOverview['delayedProjects'][number]>()
const delayedColumns = delayedColumn.columns([
  delayedColumn.accessor('number', {
    header: 'Project',
    cell: ({ row }) => (
      <Link to={`/projects/${row.original.id}`} className="grid min-w-0 gap-0.5 underline-offset-2 hover:underline">
        <span className="truncate font-medium">{row.original.title}</span>
        <span className="font-mono text-xs text-muted-foreground">{row.original.number}</span>
      </Link>
    ),
  }),
  delayedColumn.accessor('customer', { header: 'Customer', cell: ({ getValue }) => getValue() ?? '—' }),
  delayedColumn.accessor('progressPct', {
    header: 'Progress',
    cell: ({ getValue }) => (
      <span className="flex min-w-24 items-center gap-2">
        <Progress value={getValue()} label="Progress" className="h-1.5 flex-1" />
        <span className="w-9 text-right text-xs tabular">{formatPercent(getValue(), 0)}</span>
      </span>
    ),
  }),
  delayedColumn.accessor('daysLate', {
    header: 'Behind by',
    cell: ({ getValue }) => (
      <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-destructive">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {getValue()} {getValue() === 1 ? 'day' : 'days'}
      </span>
    ),
  }),
])

export function DelayedProjectsCard({ projects, state }: Omit<Panel, 'period'>) {
  const rows = projects?.delayedProjects ?? []
  const ready = !state.loading && !state.error
  return (
    <ChartCard
      title="Projects behind schedule"
      description={projects ? (projects.delayed > rows.length ? `The ${rows.length} furthest behind, of ${formatNumber(projects.delayed)}` : undefined) : undefined}
      empty={projects && projects.delayed === 0 ? { title: 'No project is behind schedule', description: 'All running projects are within their expected date.' } : false}
      drillDown={{ to: '/projects', label: 'View all projects' }}
      {...state}
    >
      {ready ? (
        <DataTable columns={delayedColumns} data={rows} caption="Projects past their expected completion date" density="compact" />
      ) : null}
    </ChartCard>
  )
}

export function DeliveryTrendCard({ delivery, period, state }: { delivery?: DeliveryRow[]; period?: Period; state: ChartState }) {
  const granularity = period?.granularity ?? 'DAY'
  const rows = delivery ?? []
  const total = rows.reduce((sum, r) => sum + r.onTime + r.late, 0)
  const unit = granularity === 'MONTH' ? 'month' : granularity === 'WEEK' ? 'week' : 'day'
  return (
    <ChartCard
      title="Delivery"
      description={period ? `Projects finished, ${periodLabel(period)}` : undefined}
      legend={[
        { key: 'onTime', label: 'On time', color: statusColor.good },
        { key: 'late', label: 'Late', color: statusColor.serious },
      ]}
      table={{
        caption: `Projects finished per ${unit}, on time and late`,
        columns: [
          { key: 'bucket', label: granularity === 'MONTH' ? 'Month' : granularity === 'WEEK' ? 'Week of' : 'Day' },
          { key: 'onTime', label: 'On time', align: 'right' },
          { key: 'late', label: 'Late', align: 'right' },
        ],
        rows: rows.filter((r) => r.onTime + r.late > 0).map((r) => ({ bucket: bucketTitle(granularity, r.bucket), onTime: formatNumber(r.onTime), late: formatNumber(r.late) })),
      }}
      empty={delivery && total === 0 ? { title: 'No projects finished in this period' } : false}
      footer="On time: finished on or before the expected completion date."
      {...state}
    >
      <TrendChart
        stacked
        data={rows.map((r) => ({ bucket: r.bucket, onTime: r.onTime, late: r.late }))}
        xKey="bucket"
        xFormat={(value) => bucketTick(granularity, value)}
        tooltipTitle={(value) => bucketTitle(granularity, value)}
        series={[
          { key: 'onTime', name: 'On time', kind: 'bar', color: statusColor.good },
          { key: 'late', name: 'Late', kind: 'bar', color: statusColor.serious },
        ]}
        height={180}
        description={`Number of projects finished per ${unit}, split into on time and late.`}
      />
    </ChartCard>
  )
}

export function CostComparisonCard({
  rows,
  expectedTotal,
  recordedTotal,
  state,
}: {
  rows?: { id: string; number: string; title: string; expectedCost: number; recordedCost: number; progressPct: number }[]
  expectedTotal?: number
  recordedTotal?: number
  state: ChartState
}) {
  const data = rows ?? []
  return (
    <ChartCard
      title="Expected against recorded cost"
      description={expectedTotal !== undefined && recordedTotal !== undefined ? `${formatRupees(recordedTotal)} recorded against ${formatRupees(expectedTotal)} expected` : 'Running projects and those finished in the period'}
      legend={[
        { key: 'expected', label: 'Expected', color: seriesColor(0) },
        { key: 'recorded', label: 'Recorded so far', color: seriesColor(1) },
      ]}
      table={{
        caption: 'Expected and recorded cost of each project',
        columns: [
          { key: 'project', label: 'Project' },
          { key: 'expected', label: 'Expected', align: 'right' },
          { key: 'recorded', label: 'Recorded', align: 'right' },
          { key: 'progress', label: 'Progress', align: 'right' },
        ],
        rows: data.map((r) => ({
          project: (
            <Link to={`/projects/${r.id}`} className="underline-offset-2 hover:underline">
              {r.title}
            </Link>
          ),
          expected: formatRupees(r.expectedCost),
          recorded: formatRupees(r.recordedCost),
          progress: formatPercent(r.progressPct, 0),
        })),
      }}
      empty={rows && data.length === 0 ? { title: 'No project costs to compare', description: 'Running projects and those finished this period appear here.' } : false}
      footer="Expected is the expected cost, or the budget if none is set. Recorded is the sum of entered material, labour, vendor, travel and other costs, or the single cost figure if none are itemised."
      {...state}
    >
      <BarsChart
        orientation="bars"
        data={data.map((r) => ({ label: r.title, expected: r.expectedCost, recorded: r.recordedCost }))}
        series={[
          { key: 'expected', name: 'Expected', format: (v) => formatRupees(v) },
          { key: 'recorded', name: 'Recorded so far', format: (v) => formatRupees(v) },
        ]}
        valueFormat={compactRupees}
        height={Math.max(140, data.length * 46 + 24)}
        description="Expected and recorded cost for each running or recently finished project."
      />
    </ChartCard>
  )
}

const milestoneColumn = dataTableColumns<MilestoneRow>()
const milestoneColumns = milestoneColumn.columns([
  milestoneColumn.accessor('milestone', {
    header: 'Milestone',
    cell: ({ row }) => (
      <Link to={`/projects/${row.original.projectId}`} className="grid min-w-0 gap-0.5 underline-offset-2 hover:underline">
        <span className="truncate font-medium">{row.original.milestone}</span>
        <span className="truncate text-xs text-muted-foreground">{row.original.projectTitle}</span>
      </Link>
    ),
  }),
  milestoneColumn.accessor('dueDate', {
    header: 'Due',
    cell: ({ row }) => (
      <span className="grid gap-0.5">
        <span className="whitespace-nowrap">{formatDate(row.original.dueDate)}</span>
        <span className={row.original.daysFromToday < 0 ? 'text-xs font-medium whitespace-nowrap text-destructive' : 'text-xs whitespace-nowrap text-muted-foreground'}>
          {row.original.daysFromToday < 0
            ? `${Math.abs(row.original.daysFromToday)} ${Math.abs(row.original.daysFromToday) === 1 ? 'day' : 'days'} overdue`
            : row.original.daysFromToday === 0
              ? 'Due today'
              : `In ${row.original.daysFromToday} ${row.original.daysFromToday === 1 ? 'day' : 'days'}`}
        </span>
      </span>
    ),
  }),
  milestoneColumn.accessor('status', { header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
])

export function MilestonesCard({ rows, state }: { rows?: MilestoneRow[]; state: ChartState }) {
  const ready = !state.loading && !state.error
  return (
    <ChartCard
      title="Milestones coming due"
      description="Overdue, or due within 30 days, on running projects"
      empty={rows && rows.length === 0 ? { title: 'No milestone is due soon', description: 'Nothing overdue or due in the next 30 days.' } : false}
      {...state}
    >
      {ready ? <DataTable columns={milestoneColumns} data={rows ?? []} caption="Running-project milestones overdue or due within 30 days" density="compact" /> : null}
    </ChartCard>
  )
}
