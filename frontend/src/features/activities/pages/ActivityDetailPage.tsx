import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Pencil,
  Repeat,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  activityDetailQuery,
  activityKeys,
  completeActivity,
  deleteActivity,
  dismissReminder,
  labelOf,
  rescheduleActivity,
  updateActivity,
  ENTITY_TYPES,
  INTERACTION_DIRECTIONS,
  RECURRENCE_PATTERNS,
  type CreateActivityPayload,
} from '@/features/activities/api'
import { ActivityModal } from '@/features/activities/components/ActivityModal'
import { ActivityTypeBadge } from '@/features/activities/components/ActivityTypeBadge'
import { CompleteTaskModal } from '@/features/activities/components/CompleteTaskModal'
import { RescheduleModal } from '@/features/activities/components/RescheduleModal'
import { TaskPriorityBadge } from '@/features/activities/components/TaskPriorityBadge'
import { TaskStatusBadge } from '@/features/activities/components/TaskStatusBadge'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDay } from '@/features/finance/api'
import { cn } from '@/lib/utils'

function getEntityUrl(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'CUSTOMER':
      return `/customers/${entityId}`
    case 'LEAD':
      return `/leads/${entityId}`
    case 'OPPORTUNITY':
      return `/opportunities/${entityId}`
    case 'QUOTATION':
      return `/quotations/${entityId}`
    case 'PROJECT':
      return `/projects/${entityId}`
    case 'TICKET':
      return `/support/tickets/${entityId}`
    default:
      return null
  }
}

export function ActivityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('ACTIVITY_UPDATE')
  const canDelete = useHasPermission('ACTIVITY_DELETE')

  const [editOpen, setEditOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const { data: activity, isPending, isError, error, refetch } = useQuery(activityDetailQuery(id))

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: activityKeys.all })
  }

  const completeMut = useMutation({
    mutationFn: (outcome: string) => completeActivity(id, { outcome }),
    onSuccess: invalidate,
  })

  const rescheduleMut = useMutation({
    mutationFn: ({ dueDate, reminderAt }: { dueDate: string; reminderAt?: string | null }) =>
      rescheduleActivity(id, { dueDate, reminderAt }),
    onSuccess: invalidate,
  })

  const updateMut = useMutation({
    mutationFn: (data: Partial<CreateActivityPayload>) => updateActivity(id, data),
    onSuccess: invalidate,
  })

  const dismissReminderMut = useMutation({
    mutationFn: () => dismissReminder(id),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteActivity(id),
    onSuccess: () => {
      invalidate()
      void navigate('/activities')
    },
  })

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError || !activity) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <PageHeader title="Activity" back={{ to: '/activities', label: 'Activities & follow-ups' }} />
        <ErrorState title="Activity not found" error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  const isCompleted = activity.status === 'COMPLETED'
  const isCancelled = activity.status === 'CANCELLED'
  const isOverdue =
    !isCompleted && !isCancelled && activity.dueDate && new Date(activity.dueDate) < new Date()
  const entityUrl = getEntityUrl(activity.entityType, activity.entityId)

  return (
    <div className="mx-auto grid max-w-4xl gap-6 pb-12">
      {/* Header with Navigation and Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            to="/activities"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Activities</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h1 className={cn('text-2xl font-bold tracking-tight text-foreground sm:text-3xl', isCompleted && 'line-through opacity-80')}>
              {activity.title}
            </h1>
            <ActivityTypeBadge type={activity.type} />
            <TaskStatusBadge status={activity.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCompleted && canUpdate && (
            <>
              <Button
                size="sm"
                onClick={() => setCompleteOpen(true)}
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="size-4" />
                <span>Mark Completed</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)} className="gap-1.5">
                <Clock className="size-4" />
                <span>Reschedule</span>
              </Button>
            </>
          )}

          {canUpdate && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Pencil className="size-3.5" />
              <span>Edit</span>
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (window.confirm(`Permanently remove activity "${activity.title}"?`)) {
                  deleteMut.mutate()
                }
              }}
              className="gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Overdue Warning Alert */}
      {isOverdue && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <Clock className="size-5 shrink-0" />
          <div className="text-sm font-medium">
            This activity is overdue. It was scheduled for {new Date(activity.dueDate!).toLocaleString()}.
          </div>
        </div>
      )}

      {/* Completed Outcome Alert */}
      {activity.outcome && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-0.5 text-sm">
            <span className="font-semibold">Recorded Outcome:</span>
            <p className="leading-relaxed">{activity.outcome}</p>
            {activity.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed on {new Date(activity.completedAt).toLocaleString()}
                {activity.completedBy ? ` by ${activity.completedBy}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Primary Details Card */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Main Content Area */}
        <Card className="border-border/80 md:col-span-2">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Activity Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">Description</span>
              <p className="mt-1 leading-relaxed text-sm text-foreground whitespace-pre-line">
                {activity.description || <span className="italic text-muted-foreground">No description provided.</span>}
              </p>
            </div>

            {/* Related Entity Block */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Associated Record</span>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    {labelOf(ENTITY_TYPES, activity.entityType)}
                  </Badge>
                  <span className="font-medium text-sm text-foreground">
                    {activity.entityName || 'Unlabeled Record'}
                  </span>
                </div>
                {entityUrl && (
                  <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary">
                    <Link to={entityUrl}>
                      <span>Open Record</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Recurrence & Reminders */}
            {(activity.isRecurring || activity.reminderAt) && (
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {activity.isRecurring && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                    <Repeat className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <span className="font-semibold text-foreground">Recurring Activity</span>
                      <p className="text-muted-foreground mt-0.5">
                        Repeats {labelOf(RECURRENCE_PATTERNS, activity.recurrencePattern)}
                        {activity.recurrenceEndAt ? ` until ${formatDay(activity.recurrenceEndAt)}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {activity.reminderAt && (
                  <div className="flex items-start justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Bell className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-semibold text-foreground">Reminder Scheduled</span>
                        <p className="text-muted-foreground mt-0.5">
                          {new Date(activity.reminderAt).toLocaleString()} ({activity.reminderStatus})
                        </p>
                      </div>
                    </div>
                    {activity.reminderStatus === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissReminderMut.mutate()}
                        className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Metadata Card */}
        <Card className="border-border/80">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Schedule & Ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Priority</span>
              <TaskPriorityBadge priority={activity.priority} />
            </div>

            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Assigned Owner</span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="size-3.5 text-muted-foreground" />
                <span>{activity.ownerName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Due Date & Time</span>
              <span className={cn('font-medium text-foreground', isOverdue && 'text-destructive font-semibold')}>
                {activity.dueDate ? new Date(activity.dueDate).toLocaleString() : 'No date set'}
              </span>
            </div>

            {activity.direction && (
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Direction</span>
                <span className="font-medium text-foreground">
                  {labelOf(INTERACTION_DIRECTIONS, activity.direction)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{new Date(activity.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-foreground">{new Date(activity.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals for Editing, Completing, and Rescheduling */}
      {editOpen && (
        <ActivityModal
          initial={activity}
          onClose={() => setEditOpen(false)}
          onSubmit={async (data) => {
            await updateMut.mutateAsync(data)
            setEditOpen(false)
          }}
        />
      )}

      {completeOpen && (
        <CompleteTaskModal
          activity={activity}
          onClose={() => setCompleteOpen(false)}
          onComplete={async (outcome) => {
            await completeMut.mutateAsync(outcome)
            setCompleteOpen(false)
          }}
        />
      )}

      {rescheduleOpen && (
        <RescheduleModal
          activity={activity}
          onClose={() => setRescheduleOpen(false)}
          onReschedule={async (dueDate, reminderAt) => {
            await rescheduleMut.mutateAsync({ dueDate, reminderAt })
            setRescheduleOpen(false)
          }}
        />
      )}
    </div>
  )
}
