import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckSquare, Clock, Link as LinkIcon, ListTodo, Plus, Square, Trash2, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormDialog } from '@/components/shared/FormDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusSelect, type StatusOption } from '@/components/ui/status-select'
import { Textarea } from '@/components/ui/textarea'
import { useHasPermission } from '@/features/auth/auth-context'
import { daysUntil, formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { projectsApi, type ProjectMember, type ProjectMilestone, type ProjectTask } from '../api'
import { PROJECT_PRIORITIES } from '../lib'
import { optimisticProject, withTasks } from '../optimistic'
import { PriorityBadge } from './ProjectStatusBadge'

const TASK_STATUS_OPTIONS: StatusOption[] = [
  { value: 'TODO', label: 'To do', color: 'bg-slate-400' },
  { value: 'IN_PROGRESS', label: 'In progress', color: 'bg-violet-500' },
  { value: 'IN_REVIEW', label: 'In review', color: 'bg-amber-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-500' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-rose-500' },
]

const TASK_STATUSES = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
] as const

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Completed' },
] as const
type Filter = (typeof FILTERS)[number]['value']

const schema = z
  .object({
    title: z.string().trim().min(1, 'Name the task').max(250, 'Keep it under 250 characters'),
    description: z.string(),
    milestoneId: z.string(),
    assignedToId: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    startDate: z.string(),
    dueDate: z.string(),
    estimatedHours: z.string().refine((value) => value === '' || Number(value) >= 0, 'Hours cannot be negative'),
    dependsOn: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (values.startDate && values.dueDate && values.dueDate < values.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: 'Due date cannot be before start date' })
    }
  })
type FormValues = z.infer<typeof schema>

type ProjectTasksTabProps = {
  projectId: string
  tasks: ProjectTask[]
  milestones: ProjectMilestone[]
  members: ProjectMember[]
}

/** The work items of a project: who has them, when they are due, what they wait on and their checklists. */
export function ProjectTasksTab({ projectId, tasks, milestones, members }: ProjectTasksTabProps) {
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<ProjectTask | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const optimistic = optimisticProject(queryClient, projectId)

  // A new status shows at once (and moves the progress figure); the server confirms in the background.
  const changeStatus = useMutation({
    mutationFn: ({ task, status }: { task: ProjectTask; status: string }) => projectsApi.updateTaskStatus(projectId, task.id, status),
    onMutate: ({ task, status }) =>
      optimistic.apply((project) =>
        withTasks(
          project,
          project.tasks.map((item) =>
            item.id === task.id ? { ...item, status, completedAt: status === 'COMPLETED' ? new Date().toISOString() : null } : item,
          ),
        ),
      ),
    onError: (_error, _variables, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })
  const remove = useMutation({
    mutationFn: (task: ProjectTask) => projectsApi.deleteTask(projectId, task.id),
    onMutate: (task) => {
      setRemoving(null)
      return optimistic.apply((project) =>
        withTasks(
          project,
          project.tasks.filter((item) => item.id !== task.id),
        ),
      )
    },
    onError: (_error, _task, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })

  const visible = useMemo(() => {
    const open = tasks.filter((task) => task.status !== 'COMPLETED').sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    const done = tasks.filter((task) => task.status === 'COMPLETED')
    return filter === 'open' ? open : filter === 'done' ? done : [...open, ...done]
  }, [tasks, filter])
  const counts = { all: tasks.length, open: tasks.filter((task) => task.status !== 'COMPLETED').length, done: tasks.filter((task) => task.status === 'COMPLETED').length }

  return (
    <section aria-labelledby="tasks-heading" className="grid gap-4">
      {/* The tab already says "Tasks (n)", so the heading is kept for screen readers only. */}
      <h2 id="tasks-heading" className="sr-only">
        Tasks
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {tasks.length > 0 ? (
          <div role="group" aria-label="Show tasks" className="inline-flex rounded-xl bg-muted p-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                  filter === option.value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label} <span className="tabular text-xs">{formatNumber(counts[option.value])}</span>
              </button>
            ))}
          </div>
        ) : null}
        {canUpdate ? (
          <Button size="sm" className="ml-auto" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add task
          </Button>
        ) : null}
      </div>

      {changeStatus.isError ? <ErrorState title="The task could not be updated" error={changeStatus.error} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="The task could not be deleted" error={remove.error} variant="compact" /> : null}

      {tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks yet" description={canUpdate ? 'Add the work items for the team.' : 'No tasks in this project yet.'} />
      ) : visible.length === 0 ? (
        <EmptyState variant="compact" title={filter === 'open' ? 'Nothing left to do' : 'Nothing completed yet'} />
      ) : (
        <ul className="grid gap-3">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              projectId={projectId}
              task={task}
              canUpdate={canUpdate}
              onStatus={(status) => changeStatus.mutate({ task, status })}
              onDelete={() => setRemoving(task)}
            />
          ))}
        </ul>
      )}

      {adding ? <AddTaskDialog projectId={projectId} tasks={tasks} milestones={milestones} members={members} onClose={() => setAdding(false)} /> : null}

      <ConfirmationDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title="Delete this task?"
        description={removing ? `“${removing.title}” and its checklist will be removed.` : undefined}
        confirmLabel="Delete task"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </section>
  )
}

type TaskRowProps = {
  projectId: string
  task: ProjectTask
  canUpdate: boolean
  onStatus: (status: string) => void
  onDelete: () => void
}

function TaskRow({ projectId, task, canUpdate, onStatus, onDelete }: TaskRowProps) {
  const done = task.status === 'COMPLETED'
  const late = !done && task.dueDate ? daysUntil(task.dueDate) < 0 : false
  const daysLate = late && task.dueDate ? -daysUntil(task.dueDate) : 0
  const [addingItem, setAddingItem] = useState(false)
  const hasChecklist = (task.checklists?.length ?? 0) > 0

  return (
    <li className={cn('grid gap-3 rounded-xl border border-border/70 p-3 shadow-soft', done ? 'bg-muted/40' : 'bg-card')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            disabled={!canUpdate}
            onClick={() => onStatus(done ? 'TODO' : 'COMPLETED')}
            aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as completed`}
            className="mt-0.5 shrink-0 rounded-md text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-default disabled:hover:text-muted-foreground"
          >
            {done ? <CheckSquare className="size-5 text-success" aria-hidden="true" /> : <Square className="size-5" aria-hidden="true" />}
          </button>
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn('text-sm font-semibold', done && 'text-muted-foreground line-through')}>{task.title}</h3>
              {/* Priority only matters while the work is open, and "Medium" is the default, so it is not repeated on every card. */}
              {!done && task.priority !== 'MEDIUM' ? <PriorityBadge priority={task.priority} /> : null}
              {task.milestoneTitle ? (
                <span title={task.milestoneTitle} className="max-w-[16rem] truncate rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {task.milestoneTitle}
                </span>
              ) : null}
              {/* The status dropdown already shows the status; the badge is only for people who cannot change it. */}
              {!canUpdate ? <StatusBadge status={task.status} /> : null}
            </div>
            {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {task.assignedToName ? (
                <span className="flex items-center gap-1">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  {task.assignedToName}
                </span>
              ) : (
                <span>Unassigned</span>
              )}
              {task.dueDate && !done ? (
                <span className={cn('flex items-center gap-1', late && 'font-medium text-destructive')}>
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Due {formatDate(task.dueDate)}
                  {late ? ` · ${daysLate} day${daysLate === 1 ? '' : 's'} late` : ''}
                </span>
              ) : null}
              {task.estimatedHours ? (
                <span className="flex items-center gap-1" title="Estimated hours">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {task.estimatedHours} h
                </span>
              ) : null}
              {canUpdate && !done && !hasChecklist && !addingItem ? (
                <button
                  type="button"
                  onClick={() => setAddingItem(true)}
                  className="flex items-center gap-1 rounded text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Checklist
                </button>
              ) : null}
            </p>
            {task.dependencies && task.dependencies.length > 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <LinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
                Waits for {task.dependencies.map((dependency) => dependency.dependsOnTaskTitle).join(', ')}
              </p>
            ) : null}
          </div>
        </div>

        {canUpdate ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusSelect
              aria-label={`Status of ${task.title}`}
              value={task.status}
              onValueChange={onStatus}
              statuses={TASK_STATUS_OPTIONS}
              className="w-40"
              triggerClassName="h-8 w-40 text-xs"
            />
            <Button variant="ghost" size="icon" aria-label={`Delete ${task.title}`} onClick={onDelete}>
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      {hasChecklist || addingItem ? (
        <Checklist projectId={projectId} task={task} canUpdate={canUpdate} adding={addingItem} onAddingChange={setAddingItem} />
      ) : null}
    </li>
  )
}

type ChecklistProps = {
  projectId: string
  task: ProjectTask
  canUpdate: boolean
  /** Whether the "new item" box is open; the card owns this so its "+ Checklist" link can open it. */
  adding: boolean
  onAddingChange: (adding: boolean) => void
}

function Checklist({ projectId, task, canUpdate, adding, onAddingChange }: ChecklistProps) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const items = task.checklists ?? []
  const doneCount = items.filter((item) => item.completed).length
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] })

  const add = useMutation({
    mutationFn: (itemText: string) => projectsApi.addChecklistItem(projectId, task.id, itemText),
    onSuccess: () => {
      void refresh()
      setText('')
      onAddingChange(false)
    },
  })
  const optimistic = optimisticProject(queryClient, projectId)
  /** Changes this task's checklist on the screen at once. */
  const editChecklist = (change: (items: NonNullable<ProjectTask['checklists']>) => NonNullable<ProjectTask['checklists']>) =>
    optimistic.apply((project) => ({
      ...project,
      tasks: project.tasks.map((item) => (item.id === task.id ? { ...item, checklists: change(item.checklists ?? []) } : item)),
    }))
  const toggle = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: string; completed: boolean }) => projectsApi.toggleChecklistItem(projectId, task.id, itemId, completed),
    onMutate: ({ itemId, completed }) => editChecklist((list) => list.map((entry) => (entry.id === itemId ? { ...entry, completed } : entry))),
    onError: (_error, _variables, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })
  const removeItem = useMutation({
    mutationFn: (itemId: string) => projectsApi.deleteChecklistItem(projectId, task.id, itemId),
    onMutate: (itemId) => editChecklist((list) => list.filter((entry) => entry.id !== itemId)),
    onError: (_error, _itemId, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })

  const submit = () => {
    if (text.trim()) add.mutate(text.trim())
  }

  if (items.length === 0 && !canUpdate) return null

  return (
    <div className="grid gap-2 border-t pt-3 sm:pl-8">
      {items.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Checklist ({doneCount} of {items.length})
          </span>
          {canUpdate && !adding ? (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onAddingChange(true)}>
              Add item
            </Button>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center justify-between gap-2 text-sm">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <Checkbox
                  checked={item.completed}
                  disabled={!canUpdate}
                  onChange={(event) => toggle.mutate({ itemId: item.id, completed: event.target.checked })}
                />
                <span className={item.completed ? 'text-muted-foreground line-through' : undefined}>{item.itemText}</span>
              </label>
              {canUpdate ? (
                <button
                  type="button"
                  onClick={() => removeItem.mutate(item.id)}
                  aria-label={`Remove “${item.itemText}” from the checklist`}
                  className="rounded px-1 text-xs text-muted-foreground opacity-0 transition-opacity outline-none group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <div className="flex items-center gap-2">
          <Input
            aria-label="New checklist item"
            placeholder="What needs checking?"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="h-8 flex-1 text-sm md:h-8"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              } else if (event.key === 'Escape') {
                onAddingChange(false)
                setText('')
              }
            }}
          />
          <Button size="sm" onClick={submit} loading={add.isPending}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onAddingChange(false)
              setText('')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
      {add.isError ? <p role="alert" className="text-xs text-destructive">Could not add the item. Try again.</p> : null}
    </div>
  )
}

type AddTaskDialogProps = {
  projectId: string
  tasks: ProjectTask[]
  milestones: ProjectMilestone[]
  members: ProjectMember[]
  onClose: () => void
}

function AddTaskDialog({ projectId, tasks, milestones, members, onClose }: AddTaskDialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', milestoneId: '', assignedToId: '', priority: 'MEDIUM', startDate: '', dueDate: '', estimatedHours: '', dependsOn: [] },
  })

  const add = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.addTask(projectId, {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        milestoneId: values.milestoneId || undefined,
        assignedToId: values.assignedToId || undefined,
        priority: values.priority,
        startDate: values.startDate || undefined,
        dueDate: values.dueDate || undefined,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : undefined,
        dependsOnTaskIds: values.dependsOn.length > 0 ? values.dependsOn : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Add a task"
        description="A piece of work, optionally under a milestone."
        submitLabel="Add task"
        onSubmit={form.handleSubmit((values) => add.mutate(values))}
        submitting={add.isPending}
        error={add.error}
        size="lg"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task</FormLabel>
              <FormControl>
                <Input placeholder="Procure the inverter units" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="What needs to be done" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="milestoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Milestone</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">None</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.title}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned to</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Nobody yet</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.userName}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {PROJECT_PRIORITIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimatedHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" min="0" step="0.5" placeholder="16" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {tasks.length > 0 ? (
          <FormField
            control={form.control}
            name="dependsOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Can only start once these are finished</FormLabel>
                <div className="grid max-h-32 gap-1 overflow-y-auto rounded-xl border bg-muted/30 p-2">
                  {tasks.map((existing) => (
                    <label key={existing.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(existing.id)}
                        onChange={(event) =>
                          field.onChange(event.target.checked ? [...field.value, existing.id] : field.value.filter((id) => id !== existing.id))
                        }
                      />
                      <span className="truncate">{existing.title}</span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
      </FormDialog>
    </Form>
  )
}
