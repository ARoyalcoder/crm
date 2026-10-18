import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, Plus, Trash2 } from 'lucide-react'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'
import { projectsApi, type Deliverable, type ProjectMilestone } from '../api'
import { optimisticProject } from '../optimistic'

const DELIVERABLE_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
] as const

const schema = z.object({
  title: z.string().trim().min(1, 'Name the deliverable').max(250, 'Keep it under 250 characters'),
  description: z.string(),
  milestoneId: z.string(),
  dueDate: z.string(),
  acceptanceCriteria: z.string(),
  fileUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\//i.test(value), 'Use a link that starts with http:// or https://'),
})
type FormValues = z.infer<typeof schema>

type ProjectDeliverablesTabProps = {
  projectId: string
  deliverables: Deliverable[]
  milestones: ProjectMilestone[]
}

/** What the customer is owed on a project, and where each item stands: pending, submitted, accepted or rejected. */
export function ProjectDeliverablesTab({ projectId, deliverables, milestones }: ProjectDeliverablesTabProps) {
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Deliverable | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', milestoneId: '', dueDate: '', acceptanceCriteria: '', fileUrl: '' },
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] })

  const add = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.addDeliverable(projectId, {
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        milestoneId: values.milestoneId || undefined,
        dueDate: values.dueDate || undefined,
        acceptanceCriteria: values.acceptanceCriteria.trim() || undefined,
        fileUrl: values.fileUrl.trim() || undefined,
      }),
    onSuccess: () => {
      void refresh()
      setAdding(false)
      form.reset()
    },
  })
  const optimistic = optimisticProject(queryClient, projectId)
  // A new status or a removal shows at once; the server confirms in the background.
  const changeStatus = useMutation({
    mutationFn: ({ deliverable, status }: { deliverable: Deliverable; status: string }) =>
      projectsApi.updateDeliverableStatus(projectId, deliverable.id, status),
    onMutate: ({ deliverable, status }) =>
      optimistic.apply((project) => ({
        ...project,
        deliverables: project.deliverables.map((item) => (item.id === deliverable.id ? { ...item, status } : item)),
      })),
    onError: (_error, _variables, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })
  const remove = useMutation({
    mutationFn: (deliverable: Deliverable) => projectsApi.deleteDeliverable(projectId, deliverable.id),
    onMutate: (deliverable) => {
      setRemoving(null)
      return optimistic.apply((project) => ({ ...project, deliverables: project.deliverables.filter((item) => item.id !== deliverable.id) }))
    },
    onError: (_error, _deliverable, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  })

  return (
    <section aria-labelledby="deliverables-heading" className="grid gap-4">
      <h2 id="deliverables-heading" className="sr-only">
        Deliverables
      </h2>
      {canUpdate ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add deliverable
          </Button>
        </div>
      ) : null}

      {changeStatus.isError ? <ErrorState title="The deliverable could not be updated" error={changeStatus.error} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="The deliverable could not be deleted" error={remove.error} variant="compact" /> : null}

      {deliverables.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No deliverables yet"
          description={canUpdate ? 'Track drawings, reports and hand-over items for customer sign-off.' : 'Nothing recorded for this project.'}
        />
      ) : (
        <ul className="grid gap-3">
          {deliverables.map((deliverable) => (
            <li key={deliverable.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft">
              <div className="grid min-w-0 gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{deliverable.title}</h3>
                  {deliverable.milestoneTitle ? <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{deliverable.milestoneTitle}</span> : null}
                  <StatusBadge status={deliverable.status} />
                </div>
                {deliverable.description ? <p className="text-sm text-muted-foreground">{deliverable.description}</p> : null}
                {deliverable.acceptanceCriteria ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Accepted when:</span> {deliverable.acceptanceCriteria}
                  </p>
                ) : null}
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {deliverable.dueDate ? <span>Due {formatDate(deliverable.dueDate)}</span> : null}
                  {deliverable.deliveredDate ? <span>Submitted {formatDate(deliverable.deliveredDate)}</span> : null}
                  {deliverable.reviewedBy ? <span>Reviewed by {deliverable.reviewedBy}</span> : null}
                  {deliverable.fileUrl ? (
                    <a
                      href={deliverable.fileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      Open the file
                    </a>
                  ) : null}
                </p>
              </div>
              {canUpdate ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Select
                    aria-label={`Status of ${deliverable.title}`}
                    value={deliverable.status}
                    onChange={(event) => changeStatus.mutate({ deliverable, status: event.target.value })}
                    className="h-8 w-36 text-xs md:h-8"
                  >
                    {DELIVERABLE_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${deliverable.title}`} onClick={() => setRemoving(deliverable)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
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
            title="Add a deliverable"
            description="Something owed to the customer, and how acceptance is shown."
            submitLabel="Add deliverable"
            onSubmit={form.handleSubmit((values) => add.mutate(values))}
            submitting={add.isPending}
            error={add.error}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deliverable</FormLabel>
                  <FormControl>
                    <Input placeholder="As-built drawings" {...field} />
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
                    <Textarea rows={2} {...field} />
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
            </div>
            <FormField
              control={form.control}
              name="acceptanceCriteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accepted when</FormLabel>
                  <FormControl>
                    <Input placeholder="Signed off by the structural engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to the file</FormLabel>
                  <FormControl>
                    <Input type="url" inputMode="url" placeholder="https://" {...field} />
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
        title="Delete this deliverable?"
        description={removing ? `“${removing.title}” will be removed from the project.` : undefined}
        confirmLabel="Delete deliverable"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </section>
  )
}
