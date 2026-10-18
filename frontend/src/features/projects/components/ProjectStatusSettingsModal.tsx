import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { projectsApi, type ProjectStatusConfig } from '../api'

const CATEGORIES = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

const schema = z.object({
  name: z.string().trim().min(1, 'Name the status').max(100, 'Maximum 100 characters'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour'),
  category: z.string().min(1),
  isDefault: z.boolean(),
  isCompleted: z.boolean(),
  isCancelled: z.boolean(),
})
type FormValues = z.infer<typeof schema>

/** The code the system stores for a status, made from its name: "Site survey" becomes SITE_SURVEY. */
function codeFor(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

type ProjectStatusSettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The steps a project moves through. They are the columns of the board, and they decide what counts as finished. */
export function ProjectStatusSettingsModal({ open, onOpenChange }: ProjectStatusSettingsModalProps) {
  const queryClient = useQueryClient()
  const statuses = useQuery(projectsApi.statusesQuery())
  const [removing, setRemoving] = useState<ProjectStatusConfig | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#6366f1', category: 'IN_PROGRESS', isDefault: false, isCompleted: false, isCancelled: false },
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['projects', 'statuses'] })
    void queryClient.invalidateQueries({ queryKey: ['projects', 'kanban'] })
    void queryClient.invalidateQueries({ queryKey: ['projects', 'dashboard'] })
  }

  const add = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.createStatusConfig({
        code: codeFor(values.name),
        name: values.name.trim(),
        displayOrder: (statuses.data?.length ?? 0) + 1,
        color: values.color,
        category: values.category,
        isDefault: values.isDefault,
        isCompleted: values.isCompleted,
        isCancelled: values.isCancelled,
      }),
    onSuccess: () => {
      refresh()
      form.reset()
    },
  })

  const remove = useMutation({
    mutationFn: (status: ProjectStatusConfig) => projectsApi.deleteStatusConfig(status.id),
    onSuccess: () => {
      refresh()
      setRemoving(null)
    },
    onError: () => setRemoving(null),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Project statuses</DialogTitle>
            <DialogDescription>The steps a project moves through. They become the board columns.</DialogDescription>
          </DialogHeader>

          {remove.isError ? <ErrorState title="That status could not be deleted" error={remove.error} variant="compact" /> : null}

          {statuses.isPending ? (
            <SkeletonLoader variant="list" count={4} label="Loading statuses" />
          ) : statuses.isError ? (
            <ErrorState title="Could not load the statuses" error={statuses.error} onRetry={() => void statuses.refetch()} />
          ) : (
            <ul className="grid gap-2" aria-label="Current statuses">
              {statuses.data.map((status) => (
                <li key={status.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="font-medium">{status.name}</span>
                    {status.isDefault ? <Badge variant="neutral">Starting status</Badge> : null}
                    {status.isCompleted ? <Badge variant="success">Counts as completed</Badge> : null}
                    {status.isCancelled ? <Badge variant="neutral">Counts as cancelled</Badge> : null}
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Delete the ${status.name} status`} onClick={() => setRemoving(status)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => add.mutate(values))} className="grid gap-4 border-t pt-4" noValidate>
              <h3 className="text-sm font-semibold">Add a status</h3>
              {add.isError ? <ErrorState title="That status could not be added" error={add.error} variant="compact" /> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Site survey" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {CATEGORIES.map((option) => (
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colour</FormLabel>
                      <FormControl>
                        <Input type="color" className="h-10 w-20 cursor-pointer p-1" {...field} />
                      </FormControl>
                      <FormDescription>Shown as a dot beside the name.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <fieldset className="grid gap-2 text-sm">
                <legend className="mb-1 font-medium">What it means</legend>
                {(
                  [
                    ['isDefault', 'New projects start here'],
                    ['isCompleted', 'A project in this status is completed'],
                    ['isCancelled', 'A project in this status is cancelled'],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onChange={(event) => field.onChange(event.target.checked)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </fieldset>
              <div className="flex justify-end">
                <Button type="submit" loading={add.isPending}>
                  <Plus aria-hidden="true" />
                  Add status
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={removing !== null}
        onOpenChange={(next) => (next ? undefined : setRemoving(null))}
        title={removing ? `Delete the “${removing.name}” status?` : 'Delete this status?'}
        description="Projects using it cannot move on until it is replaced. This cannot be undone."
        confirmLabel="Delete status"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </>
  )
}
