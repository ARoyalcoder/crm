import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, blankToNull } from '@/lib/forms'
import { JOB_STATUSES, createJob, jobQuery, recruitmentKeys, updateJob } from '../api'

/** A whole or decimal number that may be left empty, no less than zero and, if a limit is given, no more than it. */
function optionalAmount(message: string, limit?: number) {
  return z.string().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0 && (limit === undefined || Number(value) <= limit)), message)
}

const schema = z
  .object({
    title: z.string().trim().min(1, 'Enter the job title').max(200, 'Maximum 200 characters'),
    department: z.string().trim().min(1, 'Enter the department').max(100, 'Maximum 100 characters'),
    location: z.string().max(200, 'Maximum 200 characters'),
    status: z.string().min(1),
    minExperienceYears: z.string().refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 50), 'Enter whole years, 0 to 50'),
    minSalary: optionalAmount('Enter an amount of zero or more'),
    maxSalary: optionalAmount('Enter an amount of zero or more'),
    postedDate: z.string(),
    closingDate: z.string(),
    description: z.string().trim().min(1, 'Describe the role'),
    requirements: z.string(),
  })
  .superRefine((values, context) => {
    if (values.minSalary !== '' && values.maxSalary !== '' && Number(values.minSalary) > Number(values.maxSalary)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['maxSalary'], message: 'The maximum cannot be less than the minimum' })
    }
    if (values.postedDate !== '' && values.closingDate !== '' && values.closingDate < values.postedDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['closingDate'], message: 'Closing date cannot be before posted date' })
    }
  })
type FormValues = z.infer<typeof schema>

/** Creates a job opening or edits one: the role, what it pays, and when it is open. */
export function JobFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<string | null>(null)

  const existing = useQuery({ ...jobQuery(id!), enabled: isEdit })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing.data
      ? {
          title: existing.data.title,
          department: existing.data.department,
          location: existing.data.location ?? '',
          status: existing.data.status,
          minExperienceYears: existing.data.minExperienceYears != null ? String(existing.data.minExperienceYears) : '',
          minSalary: existing.data.minSalary != null ? String(existing.data.minSalary) : '',
          maxSalary: existing.data.maxSalary != null ? String(existing.data.maxSalary) : '',
          postedDate: existing.data.postedDate ?? '',
          closingDate: existing.data.closingDate ?? '',
          description: existing.data.description,
          requirements: existing.data.requirements ?? '',
        }
      : undefined,
    defaultValues: {
      title: '',
      department: '',
      location: '',
      status: 'DRAFT',
      minExperienceYears: '',
      minSalary: '',
      maxSalary: '',
      postedDate: '',
      closingDate: '',
      description: '',
      requirements: '',
    },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        title: values.title.trim(),
        department: values.department.trim(),
        location: blankToNull(values.location.trim()),
        description: values.description.trim(),
        requirements: blankToNull(values.requirements.trim()),
        minExperienceYears: values.minExperienceYears === '' ? null : Number(values.minExperienceYears),
        minSalary: values.minSalary === '' ? null : Number(values.minSalary),
        maxSalary: values.maxSalary === '' ? null : Number(values.maxSalary),
        status: values.status,
        postedDate: blankToNull(values.postedDate),
        closingDate: blankToNull(values.closingDate),
      }
      return isEdit ? updateJob(id!, input) : createJob(input)
    },
    onSuccess: (job) => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs })
      toast.success(isEdit ? 'Job saved' : 'Job created')
      navigate(`/recruitment/jobs/${job.id}`)
    },
    onError: (error) => setFailure(applyServerErrors(form, error)),
  })

  if (isEdit && existing.isPending) return <SkeletonLoader variant="page" label="Loading the job" />
  if (isEdit && existing.isError) return <ErrorState title="Could not load this job" error={existing.error} onRetry={() => void existing.refetch()} />

  const text = (name: 'title' | 'department' | 'location', label: string, props: { placeholder?: string } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={props.placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const amount = (name: 'minSalary' | 'maxSalary', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="Per year, in rupees" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const cancelTo = isEdit ? `/recruitment/jobs/${id}` : '/recruitment/jobs'

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title={isEdit ? 'Edit job' : 'New job'}
        back={{ to: cancelTo, label: isEdit ? 'Job' : 'Job openings' }}
        description="A role the business is hiring for. It takes applications once open."
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
              <CardTitle>The role</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{text('title', 'Job title', { placeholder: 'Site supervisor' })}</div>
              {text('department', 'Department', { placeholder: 'Operations' })}
              {text('location', 'Location', { placeholder: 'Pune' })}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About the role</FormLabel>
                      <FormControl>
                        <Textarea rows={5} placeholder="What the person will do day to day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What we are looking for</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Skills, experience and certificates" {...field} />
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
              <CardTitle>Experience and pay</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="minExperienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum experience (years)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min="0" max="50" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {amount('minSalary', 'Lowest pay')}
              {amount('maxSalary', 'Highest pay')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>When it is open</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {JOB_STATUSES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormDescription>Only open jobs take applications.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posted on</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="closingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Closes on</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to={cancelTo}>Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Create job'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
