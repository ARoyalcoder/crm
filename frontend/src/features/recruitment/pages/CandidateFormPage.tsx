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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, blankToNull } from '@/lib/forms'
import { candidateQuery, createCandidate, recruitmentKeys, updateCandidate } from '../api'
import { webAddress } from '../lib'

const PHONE = /^[+0-9][0-9 ()-]{5,28}$/

/** A number that may be left empty, no less than zero, no more than `max`, and whole when `whole` is set. */
function optionalNumber(message: string, max: number, whole = false) {
  return z.string().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max && (!whole || Number.isInteger(Number(value)))), message)
}

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter the first name').max(100, 'Maximum 100 characters'),
  lastName: z.string().trim().min(1, 'Enter the last name').max(100, 'Maximum 100 characters'),
  email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  phone: z.string().trim().refine((value) => value === '' || PHONE.test(value), 'Enter a valid phone, e.g. +91 98765 43210'),
  location: z.string().max(200, 'Maximum 200 characters'),
  experienceYears: optionalNumber('Enter whole years, 0 to 50', 50, true),
  currentSalary: optionalNumber('Enter an amount of zero or more', 9_999_999_999_999),
  expectedSalary: optionalNumber('Enter an amount of zero or more', 9_999_999_999_999),
  noticePeriodDays: optionalNumber('Enter whole days, 0 to 365', 365, true),
  linkedInUrl: z
    .string()
    .trim()
    .max(500, 'Maximum 500 characters')
    .refine((value) => value === '' || webAddress(value) !== null, 'Enter a web address starting with https://'),
  notes: z.string().max(4000, 'Maximum 4,000 characters'),
})
type FormValues = z.infer<typeof schema>

/** Adds a candidate to the talent pool or edits one. */
export function CandidateFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<string | null>(null)

  const existing = useQuery({ ...candidateQuery(id!), enabled: isEdit })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing.data
      ? {
          firstName: existing.data.firstName,
          lastName: existing.data.lastName,
          email: existing.data.email,
          phone: existing.data.phone ?? '',
          location: existing.data.location ?? '',
          experienceYears: existing.data.experienceYears != null ? String(existing.data.experienceYears) : '',
          currentSalary: existing.data.currentSalary != null ? String(existing.data.currentSalary) : '',
          expectedSalary: existing.data.expectedSalary != null ? String(existing.data.expectedSalary) : '',
          noticePeriodDays: existing.data.noticePeriodDays != null ? String(existing.data.noticePeriodDays) : '',
          linkedInUrl: existing.data.linkedInUrl ?? '',
          notes: existing.data.notes ?? '',
        }
      : undefined,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      experienceYears: '',
      currentSalary: '',
      expectedSalary: '',
      noticePeriodDays: '',
      linkedInUrl: '',
      notes: '',
    },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: blankToNull(values.phone),
        location: blankToNull(values.location),
        experienceYears: values.experienceYears === '' ? null : Number(values.experienceYears),
        currentSalary: values.currentSalary === '' ? null : Number(values.currentSalary),
        expectedSalary: values.expectedSalary === '' ? null : Number(values.expectedSalary),
        noticePeriodDays: values.noticePeriodDays === '' ? null : Number(values.noticePeriodDays),
        // There is nothing here to upload a resume with, so what is already on record is kept as it was.
        resumeStorageKey: existing.data?.resumeStorageKey ?? null,
        resumeFileName: existing.data?.resumeFileName ?? null,
        linkedInUrl: blankToNull(values.linkedInUrl),
        notes: blankToNull(values.notes),
      }
      return isEdit ? updateCandidate(id!, input) : createCandidate(input)
    },
    onSuccess: (candidate) => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.candidates })
      toast.success(isEdit ? 'Candidate saved' : 'Candidate added')
      navigate(`/recruitment/candidates/${candidate.id}`)
    },
    onError: (error) => setFailure(applyServerErrors(form, error)),
  })

  if (isEdit && existing.isPending) return <SkeletonLoader variant="page" label="Loading the candidate" />
  if (isEdit && existing.isError) return <ErrorState title="Could not load this candidate" error={existing.error} onRetry={() => void existing.refetch()} />

  const field = (name: keyof FormValues, label: string, props: { type?: string; placeholder?: string; inputMode?: 'numeric' | 'decimal'; min?: string; max?: string; step?: string } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: control }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...props} {...control} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const cancelTo = isEdit ? `/recruitment/candidates/${id}` : '/recruitment/candidates'

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title={isEdit ? 'Edit candidate' : 'Add a candidate'}
        back={{ to: cancelTo, label: isEdit ? 'Candidate' : 'Candidates' }}
        description="Someone who has applied or may be hired."
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
              {field('firstName', 'First name')}
              {field('lastName', 'Last name')}
              {field('email', 'Email', { type: 'email' })}
              {field('phone', 'Phone', { type: 'tel', placeholder: '+91 98765 43210' })}
              <div className="sm:col-span-2">{field('location', 'Location', { placeholder: 'Pune' })}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experience and pay</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {field('experienceYears', 'Experience (years)', { type: 'number', inputMode: 'numeric', min: '0', max: '50', step: '1' })}
              {field('noticePeriodDays', 'Notice period (days)', { type: 'number', inputMode: 'numeric', min: '0', max: '365', step: '1' })}
              {field('currentSalary', 'Current pay', { type: 'number', inputMode: 'decimal', min: '0', step: '0.01', placeholder: 'Per year, in rupees' })}
              {field('expectedSalary', 'Expected pay', { type: 'number', inputMode: 'decimal', min: '0', step: '0.01', placeholder: 'Per year, in rupees' })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links and notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              {field('linkedInUrl', 'LinkedIn profile', { type: 'url', placeholder: 'https://www.linkedin.com/in/…' })}
              <FormField
                control={form.control}
                name="notes"
                render={({ field: control }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Where they were found, what stood out" {...control} />
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
              {isEdit ? 'Save changes' : 'Add candidate'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
