import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { pickedOption } from '@/components/shared/picker-schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select } from '@/components/ui/select'
import { useHasPermission } from '@/features/auth/auth-context'
import { EmployeePicker } from '@/features/workforce/components/EmployeePicker'
import { humanize, initials } from '@/lib/format'
import { projectsApi, type ProjectMember } from '../api'

const ROLES = [
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'PROJECT_MANAGER', label: 'Project manager' },
  { value: 'LEAD_ENGINEER', label: 'Lead engineer' },
  { value: 'QUALITY_AUDITOR', label: 'Quality auditor' },
  { value: 'OBSERVER', label: 'Observer' },
] as const

const schema = z.object({
  employee: pickedOption.nullable().refine((value) => value !== null && Boolean(value.data?.userId), 'Choose who is joining the team'),
  role: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

type ProjectMembersTabProps = {
  projectId: string
  members: ProjectMember[]
  projectManagerId: string
}

/** The people working on a project, who runs it, and (for those who may) a way to add or remove people. */
export function ProjectMembersTab({ projectId, members, projectManagerId }: ProjectMembersTabProps) {
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<ProjectMember | null>(null)

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { employee: null, role: 'CONTRIBUTOR' } })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['projects', projectId] })

  const add = useMutation({
    mutationFn: (values: FormValues) => projectsApi.addMember(projectId, values.employee!.data!.userId!, values.role),
    onSuccess: () => {
      void refresh()
      setAdding(false)
      form.reset()
    },
  })
  const remove = useMutation({
    mutationFn: (member: ProjectMember) => projectsApi.removeMember(projectId, member.userId),
    onSuccess: () => {
      void refresh()
      setRemoving(null)
    },
    onError: () => setRemoving(null),
  })

  const submit = form.handleSubmit((values) => {
    if (members.some((member) => member.userId === values.employee!.data!.userId)) {
      form.setError('employee', { message: `${values.employee!.name} is already on this project` })
      return
    }
    add.mutate(values)
  })

  return (
    <section aria-labelledby="team-heading" className="grid gap-4">
      <h2 id="team-heading" className="sr-only">
        Team
      </h2>
      {canUpdate ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add member
          </Button>
        </div>
      ) : null}

      {remove.isError ? <ErrorState title="That person could not be removed" error={remove.error} variant="compact" /> : null}

      {members.length === 0 ? (
        <EmptyState title="No one is on this project yet" description={canUpdate ? 'Add the people who will work on it.' : undefined} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {members.map((member) => {
            const manager = member.userId === projectManagerId
            return (
              <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {initials(member.userName)}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{member.userName}</span>
                      {manager ? (
                        <Badge variant="primary">
                          <Shield className="size-3" aria-hidden="true" />
                          Manager
                        </Badge>
                      ) : null}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {humanize(member.role)}
                      {member.userEmail ? ` · ${member.userEmail}` : ''}
                    </span>
                  </span>
                </span>
                {canUpdate && !manager ? (
                  <Button variant="ghost" size="icon" aria-label={`Remove ${member.userName} from the project`} onClick={() => setRemoving(member)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            )
          })}
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
            title="Add a team member"
            description="They see this project and can be given its tasks."
            submitLabel="Add to project"
            onSubmit={submit}
            submitting={add.isPending}
            error={add.error}
          >
            <EntityPickerField control={form.control} name="employee" label="Person" required>
              {(field) => <EmployeePicker {...field} />}
            </EntityPickerField>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role on this project</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </Select>
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
        title="Remove from the project?"
        description={removing ? `${removing.userName} will lose access to this project. Their completed work stays on record.` : undefined}
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </section>
  )
}
