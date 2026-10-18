import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlarmClock, CheckCircle2, Columns3, FolderKanban, IndianRupee, List, Plus, Settings, Wallet, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { FilterSelect, ListToolbar, SearchInput } from '@/components/list/ListControls'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useHasPermission } from '@/features/auth/auth-context'
import { kpiGrid } from '@/features/analytics/lib'
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal'
import { ProjectKanbanBoard } from '@/features/projects/components/ProjectKanbanBoard'
import { PriorityBadge, ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'
import { ProjectStatusSettingsModal } from '@/features/projects/components/ProjectStatusSettingsModal'
import { projectsApi, type ProjectSummary } from '@/features/projects/api'
import { PROJECT_PRIORITIES, isClosedProject } from '@/features/projects/lib'
import { daysUntil, formatDate, formatNumber, formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { cn } from '@/lib/utils'

const column = dataTableColumns<ProjectSummary>()

const VIEWS = [
  { value: 'list', label: 'List', icon: List },
  { value: 'board', label: 'Board', icon: Columns3 },
] as const

/** Every customer project: the figures that matter on top, then a filterable list or a board by status. */
export function ProjectsPage() {
  const params = useListParams()
  const canCreate = useHasPermission('PROJECT_CREATE')
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const canConfigure = useHasPermission('PROJECT_CONFIGURE')
  const [creating, setCreating] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  const view = params.get('view') === 'board' ? 'board' : 'list'
  const search = params.get('search')
  const status = params.get('status')
  const priority = params.get('priority')

  const dashboard = useQuery(projectsApi.dashboardQuery())
  const statuses = useQuery(projectsApi.statusesQuery())
  const board = useQuery({ ...projectsApi.kanbanQuery(), enabled: view === 'board' })
  const projects = useQuery({
    ...projectsApi.listQuery({ search: search || undefined, status: status || undefined, priority: priority || undefined, page: params.page, size: 20 }),
    enabled: view === 'list',
  })

  const statusOptions = useMemo(() => (statuses.data ?? []).map((item) => ({ value: item.code, label: item.name })), [statuses.data])
  const filtered = Boolean(search || status || priority)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('title', {
          header: 'Project',
          cell: ({ row }) => (
            <Link to={`/projects/${row.original.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="font-medium">{row.original.title}</span>
              <span className="text-xs text-muted-foreground">
                <span className="font-mono">{row.original.projectNumber}</span> · {row.original.customerName}
              </span>
            </Link>
          ),
        }),
        column.accessor('status', { header: 'Status', cell: ({ getValue }) => <ProjectStatusBadge status={getValue()} /> }),
        column.accessor('priority', { header: 'Priority', cell: ({ getValue }) => <PriorityBadge priority={getValue()} /> }),
        column.accessor('projectManagerName', { header: 'Manager' }),
        column.accessor('progressPercentage', {
          header: 'Progress',
          cell: ({ row }) => (
            <span className="flex items-center gap-2">
              <Progress value={row.original.progressPercentage} label={`${row.original.title} progress`} className="w-20" />
              <span className="tabular text-xs text-muted-foreground">{Math.round(row.original.progressPercentage)}%</span>
            </span>
          ),
        }),
        column.accessor('budget', {
          header: () => <span className="block text-right">Budget</span>,
          cell: ({ row }) => <span className="block text-right tabular">{formatRupees(row.original.budget)}</span>,
        }),
        column.accessor('expectedCompletionDate', {
          header: 'Due',
          cell: ({ row }) => {
            const late = !isClosedProject(row.original.status, statuses.data) && daysUntil(row.original.expectedCompletionDate) < 0
            return (
              <span className="grid gap-0.5">
                <span className="whitespace-nowrap">{formatDate(row.original.expectedCompletionDate)}</span>
                {late ? <span className="text-xs font-medium text-destructive">{-daysUntil(row.original.expectedCompletionDate)} days late</span> : null}
              </span>
            )
          },
        }),
      ]),
    [statuses.data],
  )

  const newProject = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden="true" />
      New project
    </Button>
  )

  const totals = dashboard.data

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Projects"
        description="Deliveries from kick-off to hand-over: schedule, tasks, budget, health."
        action={
          <>
            <div role="group" aria-label="View" className="inline-flex rounded-xl bg-muted p-1">
              {VIEWS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => params.set('view', value === 'board' ? 'board' : '')}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    view === value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            {canConfigure ? (
              <Button variant="outline" onClick={() => setConfiguring(true)}>
                <Settings aria-hidden="true" />
                Statuses
              </Button>
            ) : null}
            {canCreate ? newProject : null}
          </>
        }
      />

      {dashboard.isPending ? (
        <SkeletonLoader variant="kpis" count={6} label="Loading project figures" />
      ) : totals ? (
        <div className={kpiGrid(6)}>
          <StatCard label="Projects" icon={FolderKanban} value={formatNumber(totals.totalProjects)} hint="Not counting deleted ones" />
          <StatCard label="In progress" icon={Activity} tone="info" value={formatNumber(totals.activeProjects)} hint="Neither finished nor cancelled" />
          <StatCard label="Completed" icon={CheckCircle2} tone="success" value={formatNumber(totals.completedProjects)} />
          <StatCard
            label="Delayed"
            icon={AlarmClock}
            tone={totals.delayedProjects > 0 ? 'danger' : 'success'}
            value={formatNumber(totals.delayedProjects)}
            hint="Open and past the expected date"
          />
          <StatCard label="Total budget" icon={Wallet} value={formatRupees(totals.totalBudget, { compact: true })} hint="Excluding cancelled projects" />
          <StatCard label="Recorded revenue" icon={IndianRupee} value={formatRupees(totals.totalRevenue, { compact: true })} hint="As entered on each project" />
        </div>
      ) : (
        <ErrorState title="Could not load the project figures" error={dashboard.error} onRetry={() => void dashboard.refetch()} variant="compact" />
      )}

      {view === 'board' ? (
        board.isPending ? (
          <SkeletonLoader variant="card" height={420} label="Loading the board" />
        ) : board.data ? (
          <ProjectKanbanBoard board={board.data} canMove={canUpdate} />
        ) : (
          <ErrorState title="Could not load the board" error={board.error} onRetry={() => void board.refetch()} />
        )
      ) : (
        <AdminList
          noun="projects"
          singular="project"
          query={projects}
          columns={columns}
          alignRight={['budget']}
          onPageChange={params.setPage}
          filtered={filtered}
          emptyAction={canCreate ? newProject : undefined}
          toolbar={
            <ListToolbar
              onReset={filtered ? () => params.setMany({ search: '', status: '', priority: '' }) : undefined}
            >
              <SearchInput label="Search projects" value={search} onChange={(value) => params.set('search', value)} />
              <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(value) => params.set('status', value)} options={statusOptions} />
              <FilterSelect
                label="Priority"
                allLabel="Any priority"
                value={priority}
                onChange={(value) => params.set('priority', value)}
                options={[...PROJECT_PRIORITIES]}
              />
            </ListToolbar>
          }
        />
      )}

      {creating ? <CreateProjectModal open onOpenChange={setCreating} /> : null}
      {configuring ? <ProjectStatusSettingsModal open onOpenChange={setConfiguring} /> : null}
    </div>
  )
}
