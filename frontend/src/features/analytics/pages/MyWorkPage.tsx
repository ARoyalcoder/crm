import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Headphones,
  ListTodo,
  Mail,
  MapPin,
  Phone,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressCard } from '@/components/shared/ProgressCard'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { myWorkQuery, type MyWork, type TaskRow } from '@/features/analytics/api'
import { WorkCard, WorkRow } from '@/features/analytics/components/WorkCard'
import { kpiGrid } from '@/features/analytics/lib'
import { useAuth } from '@/features/auth/auth-context'
import { entityPath } from '@/lib/entity-links'
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupees, formatTime, humanize, isoDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const TASK_ICON: Record<string, LucideIcon> = {
  CALL: Phone,
  MEETING: Users,
  EMAIL: Mail,
  SITE_VISIT: MapPin,
  VISIT: MapPin,
  FOLLOW_UP: CalendarCheck,
}

function greeting(now = new Date()): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

function dayWords(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function taskDue(task: TaskRow): string {
  if (!task.dueAt) return 'No due time'
  const due = new Date(task.dueAt)
  return isoDate(due) === isoDate(new Date()) ? `Today, ${formatTime(task.dueAt)}` : formatDateTime(task.dueAt)
}

function formatTarget(type: string, value: number | null): string {
  if (value === null) return '—'
  if (type === 'SALES_REVENUE' || type === 'COLLECTION_AMOUNT') return formatRupees(value, { compact: true })
  if (type === 'LEAD_CONVERSION') return formatPercent(value, 0)
  return formatNumber(value)
}

/**
 * The signed-in person's own day. Everything here is theirs and nobody else's; each block appears only if
 * their role gives them that part of the system (a technician gets jobs, a salesperson follow-ups, finance collection calls).
 */
export function MyWorkPage() {
  const { user } = useAuth()
  const query = useQuery(myWorkQuery)
  const data = query.data
  const first = user?.fullName.split(/\s+/)[0]

  if (query.isError) {
    return (
      <div className="grid gap-4">
        <PageHeader title="My work" description="Your tasks, projects and targets." />
        <ErrorState title="Could not load your work" error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title={first ? `${greeting()}, ${first}` : 'My work'}
        description={data ? dayWords(data.asOf) : 'Your tasks, projects and targets.'}
      />

      {query.isPending ? (
        <>
          <SkeletonLoader variant="kpis" label="Loading your work" />
          <SkeletonLoader variant="card" height={280} />
        </>
      ) : data ? (
        <MyWorkBody data={data} />
      ) : null}
    </div>
  )
}

function nothingAtAll(data: MyWork): boolean {
  return !data.tasks && !data.projectTasks && !data.projects && !data.jobs && !data.tickets && !data.collections && !data.targets
}

function MyWorkBody({ data }: { data: MyWork }) {
  if (nothingAtAll(data)) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nothing is assigned to you in the areas your role can use.
        </CardContent>
      </Card>
    )
  }

  const overdue = (data.tasks?.overdue ?? 0) + (data.projectTasks?.overdue ?? 0)
  const showOverdue = data.tasks !== null || data.projectTasks !== null

  return (
    <>
      <div className={kpiGrid([data.tasks, showOverdue, data.projectTasks, data.jobs, data.tickets, data.collections].filter(Boolean).length)}>
        {data.tasks ? (
          <StatCard label="Due today" icon={CalendarCheck} value={formatNumber(data.tasks.dueToday)} hint={`${formatNumber(data.tasks.upcoming7Days)} more in the next 7 days`} href="/activities" />
        ) : null}
        {showOverdue ? (
          <StatCard
            label="Overdue"
            icon={TriangleAlert}
            tone={overdue > 0 ? 'danger' : 'success'}
            value={formatNumber(overdue)}
            hint={overdue > 0 ? 'Follow-ups and project tasks past their date' : 'Nothing is overdue'}
          />
        ) : null}
        {data.projectTasks ? <StatCard label="Open project tasks" icon={ListTodo} tone="info" value={formatNumber(data.projectTasks.open)} hint="Assigned to you" /> : null}
        {data.jobs ? <StatCard label="Field jobs today" icon={MapPin} tone="info" value={formatNumber(data.jobs.today)} hint={`${formatNumber(data.jobs.upcoming)} more coming up`} href="/my-jobs" /> : null}
        {data.tickets ? (
          <StatCard
            label="My open tickets"
            icon={Headphones}
            tone={data.tickets.breached > 0 ? 'danger' : 'primary'}
            value={formatNumber(data.tickets.open)}
            hint={data.tickets.breached > 0 ? `${formatNumber(data.tickets.breached)} past their due time` : 'None past their due time'}
            href="/support/tickets"
          />
        ) : null}
        {data.collections ? (
          <StatCard
            label="Collection calls"
            icon={CircleDollarSign}
            tone={data.collections.overdue > 0 ? 'warning' : 'primary'}
            value={formatNumber(data.collections.open)}
            hint={data.collections.overdue > 0 ? `${formatNumber(data.collections.overdue)} past their date` : 'None past their date'}
            href="/receivables/collection-tasks"
          />
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          {data.tasks ? (
            <WorkCard
              title="Follow-ups and tasks"
              count={data.tasks.dueToday + data.tasks.overdue}
              viewAll={{ to: '/activities', label: 'All activities' }}
              isEmpty={data.tasks.items.length === 0}
              empty={{ title: 'Nothing to follow up', description: 'Tasks and follow-ups assigned to you, due soon or overdue, appear here.' }}
            >
              {data.tasks.items.map((task) => (
                <WorkRow
                  key={task.id}
                  icon={TASK_ICON[(task.type ?? '').toUpperCase()] ?? CalendarClock}
                  iconTone={task.overdue ? 'danger' : 'primary'}
                  title={task.title}
                  subtitle={[task.entityName, task.type ? humanize(task.type) : null].filter(Boolean).join(' · ') || undefined}
                  meta={<span>{taskDue(task)}</span>}
                  flag={task.overdue ? { label: 'Overdue', icon: Clock3, tone: 'danger' } : undefined}
                  href={entityPath(task.entityType, task.entityId) ?? '/activities'}
                />
              ))}
            </WorkCard>
          ) : null}

          {data.projectTasks ? (
            <WorkCard
              title="Project tasks"
              count={data.projectTasks.open}
              isEmpty={data.projectTasks.items.length === 0}
              empty={{ title: 'No open project tasks', description: 'Project tasks assigned to you appear here.' }}
            >
              {data.projectTasks.items.map((task) => (
                <WorkRow
                  key={task.id}
                  icon={ListTodo}
                  iconTone={task.overdue ? 'danger' : 'info'}
                  title={task.title}
                  subtitle={task.projectTitle}
                  meta={task.dueDate ? <span>Due {formatDate(task.dueDate)}</span> : <span>No due date</span>}
                  flag={task.overdue ? { label: 'Overdue', icon: Clock3, tone: 'danger' } : undefined}
                  href={`/projects/${task.projectId}`}
                />
              ))}
            </WorkCard>
          ) : null}

          {data.jobs ? (
            <WorkCard
              title="Field jobs"
              count={data.jobs.today + data.jobs.upcoming}
              viewAll={{ to: '/my-jobs', label: 'My jobs' }}
              isEmpty={data.jobs.items.length === 0}
              empty={{ title: 'No jobs scheduled', description: 'Jobs assigned to you appear here, with time and place.' }}
            >
              {data.jobs.items.map((job) => (
                <WorkRow
                  key={job.id}
                  icon={MapPin}
                  iconTone="info"
                  title={job.title}
                  subtitle={[job.number, job.customer].filter(Boolean).join(' · ')}
                  meta={
                    <>
                      <span>{job.scheduledStart ? formatDateTime(job.scheduledStart) : 'Not scheduled'}</span>
                      <StatusBadge status={job.status} plain />
                    </>
                  }
                  href={`/field-jobs/${job.id}`}
                />
              ))}
            </WorkCard>
          ) : null}
        </div>

        <div className="grid gap-4">
          {data.targets ? (
            <Card>
              <CardHeader>
                <CardTitle>Your targets</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(data.targets.year, data.targets.month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
              </CardHeader>
              <CardContent className="grid gap-5">
                {data.targets.items.map((target) => (
                  <div key={target.type} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{target.label}</span>
                      {target.achievementPct !== null ? (
                        <span className="font-semibold tabular">{formatPercent(target.achievementPct, 0)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not measured yet</span>
                      )}
                    </div>
                    {target.achievementPct !== null ? (
                      <Progress value={Math.min(100, target.achievementPct)} label={target.label} tone={target.achievementPct >= 100 ? 'success' : 'primary'} />
                    ) : null}
                    <p className="text-xs text-muted-foreground tabular">
                      {target.tracked
                        ? `${formatTarget(target.type, target.actual)} of ${formatTarget(target.type, target.target)}`
                        : `Target ${formatTarget(target.type, target.target)}. This kind of target is not measured automatically yet.`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {data.projects ? (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-4">
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="size-4 text-muted-foreground" aria-hidden="true" />
                  My projects
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4">
                {data.projects.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">You are not on any running project.</p>
                ) : (
                  data.projects.map((project) => {
                    const late = project.daysLeft < 0
                    return (
                      <ProgressCard
                        key={project.id}
                        title={project.title}
                        percent={project.progressPct}
                        icon={Briefcase}
                        tone={late ? 'danger' : project.progressPct >= 100 ? 'success' : 'primary'}
                        href={`/projects/${project.id}`}
                        detail={[project.number, project.customer].filter(Boolean).join(' · ')}
                        footer={
                          <span className={cn('flex flex-wrap items-center gap-x-2', late && 'text-destructive')}>
                            <StatusBadge status={project.status} domain="project" plain />
                            {project.expectedCompletion
                              ? late
                                ? `${Math.abs(project.daysLeft)} ${Math.abs(project.daysLeft) === 1 ? 'day' : 'days'} past ${formatDate(project.expectedCompletion)}`
                                : `Due ${formatDate(project.expectedCompletion)}, ${project.daysLeft} ${project.daysLeft === 1 ? 'day' : 'days'} left`
                              : 'No expected date'}
                            {project.role ? <span className="text-muted-foreground">· {humanize(project.role)}</span> : null}
                          </span>
                        }
                      />
                    )
                  })
                )}
              </CardContent>
            </Card>
          ) : null}

          {data.tickets ? (
            <WorkCard
              title="My tickets"
              count={data.tickets.open}
              viewAll={{ to: '/support/tickets', label: 'All tickets' }}
              isEmpty={data.tickets.items.length === 0}
              empty={{ title: 'No open tickets', description: 'Tickets assigned to you appear here.' }}
            >
              {data.tickets.items.map((ticket) => (
                <WorkRow
                  key={ticket.id}
                  icon={Headphones}
                  iconTone={ticket.breached ? 'danger' : 'primary'}
                  title={ticket.subject}
                  subtitle={[ticket.number, ticket.customer].filter(Boolean).join(' · ')}
                  meta={
                    <>
                      <StatusBadge status={ticket.priority} domain="priority" plain />
                      {ticket.dueAt ? <span>Due {formatDateTime(ticket.dueAt)}</span> : null}
                    </>
                  }
                  flag={ticket.breached ? { label: 'Past its due time', icon: Clock3, tone: 'danger' } : undefined}
                  href={`/support/tickets/${ticket.id}`}
                />
              ))}
            </WorkCard>
          ) : null}

          {data.collections ? (
            <WorkCard
              title="Collection calls"
              count={data.collections.open}
              viewAll={{ to: '/receivables/collection-tasks', label: 'All collection tasks' }}
              isEmpty={data.collections.items.length === 0}
              empty={{ title: 'No collection calls', description: 'Overdue invoices assigned to you appear here.' }}
            >
              {data.collections.items.map((task) => (
                <WorkRow
                  key={task.id}
                  icon={CircleDollarSign}
                  iconTone={task.dueDate && task.dueDate < isoDate(new Date()) ? 'warning' : 'primary'}
                  title={task.customer ?? 'Unnamed customer'}
                  subtitle={task.invoiceNumber ? `Invoice ${task.invoiceNumber}` : undefined}
                  meta={
                    <>
                      <span className="font-medium text-foreground tabular">{formatRupees(task.outstanding)}</span>
                      {task.dueDate ? <span>Due {formatDate(task.dueDate)}</span> : null}
                    </>
                  }
                  href="/receivables/collection-tasks"
                />
              ))}
            </WorkCard>
          ) : null}
        </div>
      </div>
    </>
  )
}
