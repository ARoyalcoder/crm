import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Circle, Layers, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormDialog } from '@/components/shared/FormDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { useHasPermission } from '@/features/auth/auth-context'
import { daysUntil, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { projectsApi, type ProjectMilestone } from '../api'
import { optimisticProject } from '../optimistic'

const schema = z.object({
  title: z.string().trim().min(1, 'Name the milestone').max(250, 'Keep it under 250 characters'),
  description: z.string(),
  dueDate: z.string().min(1, 'Choose the due date'),
})
type FormValues = z.infer<typeof schema>

type ProjectMilestonesTabProps = {
  projectId: string
  milestones: ProjectMilestone[]
}

/** The phases of a project, in order, with what is done and what is due. */
export function ProjectMilestonesTab({ projectId, milestones }: ProjectMilestonesTabProps) {
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<ProjectMilestone | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '', dueDate: '' } })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] })

  const add = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.addMilestone(projectId, { title: values.title.trim(), description: values.description.trim() || undefined, dueDate: values.dueDate }),
    onSuccess: () => {
      void refresh()
      setAdding(false)
      form.reset()
    },
  })
  const optimistic = optimisticProject(queryClient, projectId)
  // Completing or removing a milestone shows at once; the server confirms in the background.
  const complete = useMutation({
    mutationFn: (milestone: ProjectMilestone) => projectsApi.completeMilestone(projectId, milestone.id),
    onMutate: (milestone) =>
      optimistic.apply((project) => ({
        ...project,
        milestones: project.milestones.map((item) =>
          item.id === milestone.id ? { ...item, status: 'COMPLETED', progressPercentage: 100, completedDate: new Date().toISOString().slice(0, 10) } : item,
        ),
      })),
    onError: (_error, _milestone, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })
  const remove = useMutation({
    mutationFn: (milestone: ProjectMilestone) => projectsApi.deleteMilestone(projectId, milestone.id),
    onMutate: (milestone) => {
      setRemoving(null)
      return optimistic.apply((project) => ({ ...project, milestones: project.milestones.filter((item) => item.id !== milestone.id) }))
    },
    onError: (_error, _milestone, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })

  return (
    <section aria-labelledby="milestones-heading" className="grid gap-4">
      <h2 id="milestones-heading" className="sr-only">
        Milestones
      </h2>
      {canUpdate ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add milestone
          </Button>
        </div>
      ) : null}

      {complete.isError ? <ErrorState title="The milestone could not be completed" error={complete.error} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="The milestone could not be deleted" error={remove.error} variant="compact" /> : null}

      {milestones.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No milestones yet"
          description={canUpdate ? 'Break the project into phases, each with a due date.' : 'No phases planned for this project.'}
        />
      ) : (
        <ol className="grid gap-3">
          {milestones.map((milestone, index) => {
            const done = milestone.status === 'COMPLETED'
            const late = !done && daysUntil(milestone.dueDate) < 0
            return (
              <li
                key={milestone.id}
                className={cn('flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3 shadow-soft', done ? 'bg-muted/40' : 'bg-card')}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    disabled={done || !canUpdate || complete.isPending}
                    onClick={() => complete.mutate(milestone)}
                    aria-label={done ? `${milestone.title} is completed` : `Mark ${milestone.title} as completed`}
                    className="mt-0.5 shrink-0 rounded-full text-muted-foreground transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-default disabled:hover:text-muted-foreground"
                  >
                    {done ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> : <Circle className="size-5" aria-hidden="true" />}
                  </button>
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Phase {index + 1}</span>
                      <h3 className={cn('text-sm font-semibold', done && 'text-muted-foreground line-through')}>{milestone.title}</h3>
                      <StatusBadge status={milestone.status} />
                    </div>
                    {milestone.description ? <p className="text-sm text-muted-foreground">{milestone.description}</p> : null}
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Due {formatDate(milestone.dueDate)}
                      </span>
                      {late ? <span className="font-medium text-destructive">{-daysUntil(milestone.dueDate)} days late</span> : null}
                      {milestone.completedDate ? <span className="text-success">Completed {formatDate(milestone.completedDate)}</span> : null}
                    </p>
                    {milestone.taskCount > 0 ? (
                      <div className="flex max-w-xs items-center gap-2">
                        <Progress value={milestone.progressPercentage} label={`${milestone.title} tasks done`} className="h-1.5" />
                        <span className="shrink-0 text-xs tabular text-muted-foreground">
                          {milestone.completedTaskCount} of {milestone.taskCount} tasks
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                {canUpdate ? (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${milestone.title}`} onClick={() => setRemoving(milestone)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}

      {adding ? (
        <Form {...form}>
          <FormDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setAdding(false)
                form.reset()
              }
            }}
            title="Add a milestone"
            description="A phase of the project with its own due date."
            submitLabel="Add milestone"
            onSubmit={form.handleSubmit((values) => add.mutate(values))}
            submitting={add.isPending}
            error={add.error}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Site survey and requirements" {...field} />
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
                  <FormLabel>What it covers</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="The work and deliverables in this phase" {...field} />
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
          </FormDialog>
        </Form>
      ) : null}

      <ConfirmationDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title="Delete this milestone?"
        description={removing ? `“${removing.title}” will be removed. Its tasks stay, without a phase.` : undefined}
        confirmLabel="Delete milestone"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </section>
  )
}
