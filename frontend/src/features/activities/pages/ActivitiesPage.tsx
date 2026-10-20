import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Bell,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Icon3D } from '@/components/ui/icon-3d'
import {
  activitiesQuery,
  activityCountsQuery,
  activityKeys,
  completeActivity,
  createActivity,
  deleteActivity,
  dismissReminder,
  labelOf,
  rescheduleActivity,
  updateActivity,
  ACTIVITY_TYPES,
  ENTITY_TYPES,
  RECURRENCE_PATTERNS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type ActivityDetail,
  type ActivityFilters,
  type CreateActivityPayload,
} from '@/features/activities/api'
import { ActivityModal } from '@/features/activities/components/ActivityModal'
import { ActivityTypeBadge } from '@/features/activities/components/ActivityTypeBadge'
import { CompleteTaskModal } from '@/features/activities/components/CompleteTaskModal'
import { RescheduleModal } from '@/features/activities/components/RescheduleModal'
import { TaskPriorityBadge } from '@/features/activities/components/TaskPriorityBadge'
import { TaskStatusBadge } from '@/features/activities/components/TaskStatusBadge'
import { useHasPermission } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

type ViewMode = 'todays-work' | 'my-tasks' | 'overdue' | 'upcoming' | 'completed' | 'all'

export function ActivitiesPage() {
  const queryClient = useQueryClient()
  const canCreate = useHasPermission('ACTIVITY_CREATE')
  const canUpdate = useHasPermission('ACTIVITY_UPDATE')
  const canDelete = useHasPermission('ACTIVITY_DELETE')

  const [view, setView] = useState<ViewMode>('todays-work')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('dueDate,asc')
  const [page, setPage] = useState(0)
  const pageSize = 20

  // Modals
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityDetail | null>(null)
  const [completingActivity, setCompletingActivity] = useState<ActivityDetail | null>(null)
  const [reschedulingActivity, setReschedulingActivity] = useState<ActivityDetail | null>(null)

  const countsQuery = useQuery(activityCountsQuery())

  const filters: ActivityFilters = {
    view: view === 'all' ? null : view,
    search: search.trim() !== '' ? search.trim() : null,
    type: typeFilter !== '' ? typeFilter : null,
    priority: priorityFilter !== '' ? priorityFilter : null,
    entityType: entityTypeFilter !== '' ? entityTypeFilter : null,
    status: statusFilter !== '' ? statusFilter : null,
  }

  const listQuery = useQuery(activitiesQuery({ filters, page, size: pageSize, sort }))

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: activityKeys.all })
  }

  const createMut = useMutation({
    mutationFn: (data: CreateActivityPayload) => createActivity(data),
    onSuccess: invalidateAll,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateActivityPayload> }) => updateActivity(id, data),
    onSuccess: invalidateAll,
  })

  const completeMut = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) => completeActivity(id, { outcome }),
    onSuccess: invalidateAll,
  })

  const rescheduleMut = useMutation({
    mutationFn: ({ id, dueDate, reminderAt }: { id: string; dueDate: string; reminderAt?: string | null }) =>
      rescheduleActivity(id, { dueDate, reminderAt }),
    onSuccess: invalidateAll,
  })

  const dismissReminderMut = useMutation({
    mutationFn: (id: string) => dismissReminder(id),
    onSuccess: invalidateAll,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: invalidateAll,
  })

  const counts = countsQuery.data ?? {
    todaysWorkCount: 0,
    myTasksCount: 0,
    overdueCount: 0,
    upcomingCount: 0,
    completedCount: 0,
    totalOpenCount: 0,
  }

  const viewTabs: { id: ViewMode; label: string; count: number; icon: typeof CalendarCheck; tone?: 'danger' | 'success' | 'primary' }[] = [
    { id: 'todays-work', label: "Today's Work", count: counts.todaysWorkCount, icon: CalendarCheck, tone: 'primary' },
    { id: 'my-tasks', label: 'My Tasks', count: counts.myTasksCount, icon: User },
    {
      id: 'overdue',
      label: 'Overdue',
      count: counts.overdueCount,
      icon: AlertCircle,
      tone: counts.overdueCount > 0 ? 'danger' : undefined,
    },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcomingCount, icon: Clock },
    { id: 'completed', label: 'Completed', count: counts.completedCount, icon: CheckCircle2, tone: 'success' },
    { id: 'all', label: 'All Items', count: counts.totalOpenCount, icon: ListTodo },
  ]

  const hasActiveFilters =
    search.trim() !== '' || typeFilter !== '' || priorityFilter !== '' || entityTypeFilter !== '' || statusFilter !== ''

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setPriorityFilter('')
    setEntityTypeFilter('')
    setStatusFilter('')
    setPage(0)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Activities & Follow-ups"
        description="Calls, meetings, follow-ups and scheduled tasks across customers, leads, opportunities and projects."
        action={
          canCreate ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingActivity(null)
                  setActivityModalOpen(true)
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span>Log Activity</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingActivity(null)
                  setActivityModalOpen(true)
                }}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span>New Task</span>
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Top Views KPI Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {viewTabs.map((tab) => {
          const Icon = tab.icon
          const active = view === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setView(tab.id)
                setPage(0)
              }}
              className={cn(
                'group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer',
                active
                  ? 'border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary/40'
                  : 'border-border/70 bg-card hover:border-border hover:bg-muted/30',
              )}
            >
              <div className="flex items-center justify-between">
                <Icon3D
                  icon={tab.icon}
                  size="xs"
                  tone={tab.tone === 'danger' ? 'rose' : active ? 'blue' : 'slate'}
                  variant="solid-3d"
                  active={active}
                />
                <span
                  className={cn(
                    'font-mono text-base font-bold tabular-nums',
                    active
                      ? 'text-primary'
                      : tab.tone === 'danger'
                        ? 'text-destructive font-black'
                        : 'text-foreground',
                  )}
                >
                  {tab.count}
                </span>
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-semibold tracking-tight',
                  active ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Modern Filter Toolbar */}
      <Card className="border-border/70 bg-card shadow-xs">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search activities, titles, or descriptions…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(0)
                }}
                className="w-36 text-xs"
              >
                <option value="">All Types</option>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              <Select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value)
                  setPage(0)
                }}
                className="w-32 text-xs"
              >
                <option value="">All Priorities</option>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>

              <Select
                value={entityTypeFilter}
                onChange={(e) => {
                  setEntityTypeFilter(e.target.value)
                  setPage(0)
                }}
                className="w-36 text-xs"
              >
                <option value="">All Entities</option>
                {ENTITY_TYPES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </Select>

              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-40 text-xs"
              >
                <option value="dueDate,asc">Due: Earliest First</option>
                <option value="dueDate,desc">Due: Latest First</option>
                <option value="occurredAt,desc">Recently Created</option>
                <option value="priority,desc">Highest Priority</option>
                <option value="title,asc">Title: A to Z</option>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Container */}
      <Card className="overflow-hidden border-border/80 bg-card shadow-soft">
        <CardContent className="p-0">
          {listQuery.isPending ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : listQuery.isError ? (
            <div className="p-6">
              <ErrorState title="Could not load activities" error={listQuery.error} onRetry={() => void listQuery.refetch()} />
            </div>
          ) : listQuery.data.items.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="mx-auto size-10 opacity-30 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-bold text-foreground">No activities found</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                There are no activities or tasks matching the selected filters.
              </p>
              {canCreate && (
                <Button
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => {
                    setEditingActivity(null)
                    setActivityModalOpen(true)
                  }}
                >
                  <Plus className="size-4" />
                  <span>Log Activity</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-border/60 bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-4"></TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead>Activity & Notes</TableHead>
                    <TableHead>Associated Record</TableHead>
                    <TableHead className="w-24">Priority</TableHead>
                    <TableHead className="w-36">Due Date</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-32">Owner</TableHead>
                    <TableHead className="w-28 pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {listQuery.data.items.map((item) => {
                    const isDone = item.status === 'COMPLETED'
                    const isOverdue =
                      !isDone && item.status !== 'CANCELLED' && item.dueDate && new Date(item.dueDate) < new Date()

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          'transition-colors hover:bg-muted/30',
                          isDone && 'bg-muted/15 opacity-75',
                        )}
                      >
                        {/* Checkbox Complete */}
                        <TableCell className="pl-4">
                          {canUpdate && (
                            <Checkbox
                              checked={isDone}
                              disabled={isDone || completeMut.isPending}
                              onChange={() => {
                                if (!isDone) {
                                  setCompletingActivity(item)
                                }
                              }}
                              aria-label={`Mark ${item.title} as completed`}
                            />
                          )}
                        </TableCell>

                        {/* Type Badge */}
                        <TableCell>
                          <ActivityTypeBadge type={item.type} />
                        </TableCell>

                        {/* Title & Details Link to Detail Page */}
                        <TableCell className="max-w-sm">
                          <div className="grid gap-0.5">
                            <Link
                              to={`/activities/${item.id}`}
                              className={cn(
                                'font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline',
                                isDone && 'line-through text-muted-foreground',
                              )}
                            >
                              {item.title}
                            </Link>

                            {item.description && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}

                            {item.outcome && (
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                <span className="line-clamp-1">{item.outcome}</span>
                              </div>
                            )}

                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {item.isRecurring && (
                                <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] text-primary">
                                  <Repeat className="size-2.5" />
                                  <span>{labelOf(RECURRENCE_PATTERNS, item.recurrencePattern)}</span>
                                </Badge>
                              )}
                              {item.reminderAt && item.reminderStatus === 'PENDING' && (
                                <Badge
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    if (window.confirm('Dismiss this reminder?')) {
                                      dismissReminderMut.mutate(item.id)
                                    }
                                  }}
                                  className="gap-1 border-amber-500/30 text-[10px] text-amber-600 cursor-pointer hover:bg-amber-500/10 dark:text-amber-400"
                                >
                                  <Bell className="size-2.5" />
                                  <span>Reminder (Dismiss)</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Related Entity */}
                        <TableCell>
                          <div className="grid text-xs">
                            <span className="font-semibold text-foreground">
                              {item.entityName || '—'}
                            </span>
                            <span className="text-muted-foreground">
                              {labelOf(ENTITY_TYPES, item.entityType)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          <TaskPriorityBadge priority={item.priority} />
                        </TableCell>

                        {/* Due Date */}
                        <TableCell>
                          {item.dueDate ? (
                            <div className={cn('grid text-xs', isOverdue ? 'font-bold text-destructive' : 'text-muted-foreground')}>
                              <span className="font-medium">{new Date(item.dueDate).toLocaleDateString()}</span>
                              <span className="text-[11px] opacity-80">
                                {new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <TaskStatusBadge status={item.status} />
                        </TableCell>

                        {/* Owner */}
                        <TableCell>
                          <span className="text-xs font-medium text-foreground">{item.ownerName}</span>
                        </TableCell>

                        {/* Actions Dropdown */}
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isDone && canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCompletingActivity(item)}
                                className="h-7 px-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                              >
                                Done
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 text-xs">
                                <DropdownMenuItem asChild>
                                  <Link to={`/activities/${item.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                {!isDone && canUpdate && (
                                  <DropdownMenuItem onClick={() => setReschedulingActivity(item)}>
                                    Reschedule
                                  </DropdownMenuItem>
                                )}
                                {canUpdate && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingActivity(item)
                                      setActivityModalOpen(true)
                                    }}
                                  >
                                    Edit Activity
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (window.confirm(`Delete activity "${item.title}"?`)) {
                                        deleteMut.mutate(item.id)
                                      }
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {listQuery.data && listQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page {listQuery.data.page + 1} of {listQuery.data.totalPages} ({listQuery.data.totalItems} items)
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= listQuery.data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {activityModalOpen && (
        <ActivityModal
          initial={editingActivity}
          onClose={() => {
            setActivityModalOpen(false)
            setEditingActivity(null)
          }}
          onSubmit={async (data) => {
            if (editingActivity) {
              await updateMut.mutateAsync({ id: editingActivity.id, data })
            } else {
              await createMut.mutateAsync(data)
            }
            setActivityModalOpen(false)
            setEditingActivity(null)
          }}
        />
      )}

      {completingActivity && (
        <CompleteTaskModal
          activity={completingActivity}
          onClose={() => setCompletingActivity(null)}
          onComplete={async (outcome) => {
            await completeMut.mutateAsync({ id: completingActivity.id, outcome })
            setCompletingActivity(null)
          }}
        />
      )}

      {reschedulingActivity && (
        <RescheduleModal
          activity={reschedulingActivity}
          onClose={() => setReschedulingActivity(null)}
          onReschedule={async (dueDate, reminderAt) => {
            await rescheduleMut.mutateAsync({ id: reschedulingActivity.id, dueDate, reminderAt })
            setReschedulingActivity(null)
          }}
        />
      )}
    </div>
  )
}
