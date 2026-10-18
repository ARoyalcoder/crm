import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { pickedOption } from '@/components/shared/picker-schema'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { projectsApi } from '@/features/projects/api'
import { ProjectMultiPicker } from '@/features/projects/components/ProjectMultiPicker'
import { applyServerErrors, blankToNull } from '@/lib/forms'
import { PARTNER_ACCESS_LEVELS, createPartner, partnerKeys, partnerQuery, updatePartner } from '../api'

const PHONE = /^[+0-9][0-9 ()-]{5,28}$/

const schema = z.object({
  organizationName: z.string().trim().min(1, 'Enter the organisation name').max(200, 'Maximum 200 characters'),
  contactEmail: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  contactPhone: z.string().trim().min(1, 'Enter a phone number').regex(PHONE, 'Enter a valid phone, e.g. +91 98765 43210'),
  accessLevel: z.string().min(1),
  projects: z.array(pickedOption),
  services: z.string().max(2000, 'Keep this under 2,000 characters'),
  notes: z.string().max(4000, 'Maximum 4,000 characters'),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

/** Adds a partner organisation or edits one, including how much of the business it may see. */
export function PartnerFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<string | null>(null)

  const existing = useQuery({ ...partnerQuery(id!), enabled: isEdit })
  // The projects a partner is assigned to are stored as ids; their names are looked up so they can be shown and changed.
  const assignedIds = (existing.data?.assignedProjectIds ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const lookups = useQueries({ queries: assignedIds.map((projectId) => projectsApi.detailQuery(projectId)) })
  const namesReady = lookups.every((lookup) => !lookup.isPending)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values:
      existing.data && namesReady
        ? {
            organizationName: existing.data.organizationName,
            contactEmail: existing.data.contactEmail,
            contactPhone: existing.data.contactPhone,
            accessLevel: existing.data.accessLevel,
            projects: assignedIds.map((projectId, index) => ({ id: projectId, name: lookups[index]?.data?.title ?? 'A project you cannot see' })),
            services: existing.data.services ?? '',
            notes: existing.data.notes ?? '',
            active: existing.data.active,
          }
        : undefined,
    defaultValues: { organizationName: '', contactEmail: '', contactPhone: '', accessLevel: 'READ_ONLY', projects: [], services: '', notes: '', active: true },
  })
  const accessLevel = useWatch({ control: form.control, name: 'accessLevel' })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        organizationName: values.organizationName.trim(),
        contactEmail: values.contactEmail.trim(),
        contactPhone: values.contactPhone.trim(),
        accessLevel: values.accessLevel,
        // The project list only means something for partners limited to their assigned projects.
        assignedProjectIds: values.accessLevel === 'ASSIGNED_PROJECTS' && values.projects.length > 0 ? values.projects.map((project) => project.id).join(',') : null,
        services: blankToNull(values.services),
        active: values.active,
        userId: existing.data?.userId ?? null,
        notes: blankToNull(values.notes),
      }
      return isEdit && existing.data ? updatePartner(id!, { ...input, version: existing.data.version }) : createPartner(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partnerKeys.all })
      navigate('/partners')
    },
    onError: (error) => setFailure(applyServerErrors(form, error)),
  })

  if (isEdit && (existing.isPending || !namesReady)) return <SkeletonLoader variant="page" label="Loading the partner" />
  if (isEdit && existing.isError) return <ErrorState title="Could not load this partner" error={existing.error} onRetry={() => void existing.refetch()} />

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title={isEdit ? 'Edit partner' : 'Add a partner'}
        back={{ to: '/partners', label: 'Partners' }}
        description="Partners get only the access chosen here, never unrestricted access to the business."
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            setFailure(null)
            save.mutate(values)
          })}
          className="grid gap-4"
          noValidate
        >
          {failure ? (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
              {failure}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Who they are</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organisation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What they do for you</FormLabel>
                      <FormControl>
                        <Input placeholder="Consulting, installation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What they may see</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <FormField
                control={form.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access level</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {PARTNER_ACCESS_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Read only: sees shared items. Assigned projects: only those named below. Limited operations: a restricted, agreed set of actions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {accessLevel === 'ASSIGNED_PROJECTS' ? (
                <FormField
                  control={form.control}
                  name="projects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="partner-projects">Projects they may see</FormLabel>
                      <ProjectMultiPicker id="partner-projects" value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} onBlur={field.onBlur} ref={field.ref} />
                    </FormControl>
                    <FormLabel className="font-normal">This partner is active and may use its access</FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Internal notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="For your team only" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to="/partners">Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Add partner'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
