import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Camera, CalendarCheck, CalendarClock, FileText, FolderOpen, Gauge, HeartPulse, IndianRupee, Layers, ListTodo, Clock, Trash2, Users, Wallet } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { kpiGrid } from '@/features/analytics/lib'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { useHasPermission } from '@/features/auth/auth-context'
import { daysUntil, formatDate, formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'
import { ProjectDeliverablesTab } from '../components/ProjectDeliverablesTab'
import { ProjectHealthTab } from '../components/ProjectHealthTab'
import { ProjectMembersTab } from '../components/ProjectMembersTab'
import { ProjectMilestonesTab } from '../components/ProjectMilestonesTab'
import { ProjectProofTab } from '../components/ProjectProofTab'
import { PriorityBadge, ProjectStatusBadge } from '../components/ProjectStatusBadge'
import { ProjectTasksTab } from '../components/ProjectTasksTab'
import { ProjectTimelineTab } from '../components/ProjectTimelineTab'
import { projectsApi } from '../api'
import { isClosedProject } from '../lib'
import { optimisticProject } from '../optimistic'

const TABS = ['health', 'proof', 'milestones', 'tasks', 'timeline', 'deliverables', 'documents', 'team'] as const
type TabKey = (typeof TABS)[number]

function healthTone(score: number): Tone {
  return score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
}

/** One project: where it stands, what it costs, and its milestones, tasks, deliverables, team and health. */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useListParams()
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const canDelete = useHasPermission('PROJECT_DELETE')
  const canSeeDocuments = useHasPermission('DOCUMENT_VIEW')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const query = useQuery(projectsApi.detailQuery(id!))
  const statuses = useQuery(projectsApi.statusesQuery())

  // The new status shows at once; the server confirms in the background (and the lists and board refresh too).
  const optimistic = optimisticProject(queryClient, id!)
  const changeStatus = useMutation({
    mutationFn: (status: string) => projectsApi.updateStatus(id!, status),
    onMutate: (status) => optimistic.apply((project) => ({ ...project, status })),
    onError: (_error, _status, context) => optimistic.rollback(context),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
  const remove = useMutation({
    mutationFn: () => projectsApi.deleteProject(id!),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['projects', id] })
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
    onError: () => setConfirmingDelete(false),
  })

  const project = query.data
  if (query.isPending) return <SkeletonLoader variant="page" label="Loading the project" />
  if (query.isError || !project) {
    return <ErrorState title="Could not load this project" error={query.error} onRetry={() => void query.refetch()} />
  }

  const milestones = project.milestones ?? []
  const tasks = project.tasks ?? []
  const deliverables = project.deliverables ?? []
  const members = project.members ?? []
  const health = project.health
  const measurable = milestones.length + tasks.length + deliverables.length > 0
  const closed = isClosedProject(project.status, statuses.data)
  const daysToTarget = daysUntil(project.expectedCompletionDate)
  const late = !closed && daysToTarget < 0
  const doneMilestones = milestones.filter((milestone) => milestone.completedDate || milestone.status === 'COMPLETED').length
  const doneTasks = tasks.filter((task) => task.status === 'DONE' || task.status === 'COMPLETED').length

  const requested = params.get('tab')
  const tab: TabKey = (TABS as readonly string[]).includes(requested) ? (requested as TabKey) : 'milestones'

  return (
    <div className="grid gap-4">
      <PageHeader
        title={project.title}
        back={{ to: '/projects', label: 'Projects' }}
        meta={
          <span className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </span>
        }
        description={
          <span className="grid gap-1">
            <span>
              <span className="font-mono">{project.projectNumber}</span> ·{' '}
              <Link to={`/customers/${project.customerId}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                {project.customerName}
              </Link>
              {project.orderNumber ? (
                <>
                  {' '}
                  · Order{' '}
                  {project.orderId ? (
                    <Link to={`/orders/${project.orderId}`} className="underline-offset-2 hover:underline">
                      {project.orderNumber}
                    </Link>
                  ) : (
                    project.orderNumber
                  )}
                </>
              ) : null}
              {project.serviceName ? ` · ${project.serviceName}` : ''} · Managed by {project.projectManagerName}
            </span>
            {project.description ? <span>{project.description}</span> : null}
          </span>
        }
        action={
          <>
            {canUpdate ? (
              <Select
                aria-label="Project status"
                value={project.status}
                disabled={changeStatus.isPending}
                onChange={(event) => changeStatus.mutate(event.target.value)}
                className="w-44"
              >
                {statuses.data?.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {canDelete ? (
              <Button variant="outline" onClick={() => setConfirmingDelete(true)}>
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      {changeStatus.isError ? <ErrorState title="The status could not be changed" error={changeStatus.error} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="The project could not be deleted" error={remove.error} variant="compact" /> : null}

      <div className={kpiGrid(6)}>
        <StatCard
          label="Progress"
          icon={Gauge}
          tone="info"
          value={`${Math.round(project.progressPercentage)}%`}
          hint={
            <span className="grid gap-1.5">
              <Progress value={project.progressPercentage} label="Overall progress" className="h-1.5" />
              <span>
                {doneMilestones} of {milestones.length} milestones · {doneTasks} of {tasks.length} tasks
              </span>
            </span>
          }
        />
        <StatCard
          label="Health"
          icon={HeartPulse}
          tone={health && measurable ? healthTone(health.overallScore) : 'neutral'}
          value={health && measurable ? `${Math.round(health.overallScore)}%` : 'Not scored'}
          hint={
            health && measurable
              ? health.riskAlerts.length > 0
                ? `${health.riskAlerts.length} risk alert${health.riskAlerts.length === 1 ? '' : 's'}`
                : 'No risk alerts'
              : 'Appears once there is work to measure'
          }
        />
        <StatCard label="Budget" icon={Wallet} value={formatRupees(project.budget)} />
        <StatCard label="Revenue" icon={IndianRupee} value={formatRupees(project.revenue)} />
        <StatCard label="Started" icon={CalendarCheck} value={formatDate(project.startDate)} />
        <StatCard
          label={project.actualCompletionDate ? 'Completed' : 'Target completion'}
          icon={CalendarClock}
          tone={late ? 'danger' : 'neutral'}
          value={formatDate(project.actualCompletionDate ?? project.expectedCompletionDate)}
          hint={
            project.actualCompletionDate
              ? `Target was ${formatDate(project.expectedCompletionDate)}`
              : closed
                ? undefined
                : late
                  ? `${-daysToTarget} day${daysToTarget === -1 ? '' : 's'} late`
                  : daysToTarget === 0
                    ? 'Due today'
                    : `${daysToTarget} day${daysToTarget === 1 ? '' : 's'} to go`
          }
        />
      </div>

      <Tabs variant="line" value={tab} onValueChange={(next) => params.set('tab', next === 'milestones' ? '' : next)}>
        <TabsList aria-label="Project sections">
          <TabsTrigger value="health">
            <Activity aria-hidden="true" />
            Health &amp; profitability
            {health && health.riskAlerts.length > 0 ? (
              <span className={cn('rounded-full bg-destructive-soft px-1.5 text-xs font-semibold text-destructive')}>{health.riskAlerts.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="proof">
            <Camera aria-hidden="true" />
            Proof of work
          </TabsTrigger>
          <TabsTrigger value="milestones">
            <Layers aria-hidden="true" />
            Milestones{milestones.length > 0 ? ` (${milestones.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo aria-hidden="true" />
            Tasks{tasks.length > 0 ? ` (${tasks.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock aria-hidden="true" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="deliverables">
            <FileText aria-hidden="true" />
            Deliverables{deliverables.length > 0 ? ` (${deliverables.length})` : ''}
          </TabsTrigger>
          {canSeeDocuments ? (
            <TabsTrigger value="documents">
              <FolderOpen aria-hidden="true" />
              Documents
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="team">
            <Users aria-hidden="true" />
            Team{members.length > 0 ? ` (${members.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <ProjectHealthTab projectId={project.id} health={health} measurable={measurable} />
        </TabsContent>
        <TabsContent value="proof">
          <ProjectProofTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones">
          <ProjectMilestonesTab projectId={project.id} milestones={milestones} />
        </TabsContent>
        <TabsContent value="tasks">
          <ProjectTasksTab projectId={project.id} tasks={tasks} milestones={milestones} members={members} />
        </TabsContent>
        <TabsContent value="timeline">
          <ProjectTimelineTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="deliverables">
          <ProjectDeliverablesTab projectId={project.id} deliverables={deliverables} milestones={milestones} />
        </TabsContent>
        {canSeeDocuments ? (
          <TabsContent value="documents">
            <DocumentList entityType="PROJECT" entityId={project.id} />
          </TabsContent>
        ) : null}
        <TabsContent value="team">
          <ProjectMembersTab projectId={project.id} members={members} projectManagerId={project.projectManagerId} />
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this project?"
        description={`“${project.title}” will leave lists and dashboards. Its tasks and records are kept.`}
        confirmLabel="Delete project"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
