import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ServicePicker } from '@/features/catalog/components/ServicePicker'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { EmployeePicker } from '@/features/workforce/components/EmployeePicker'
import { ApiError } from '@/lib/api/errors'
import {
  AMC_FREQUENCIES,
  AMC_STATUSES,
  amcContractDetailQuery,
  amcKeys,
  createAmcContract,
  updateAmcContract,
  type AmcStatus,
  type CreateAmcContractPayload,
} from '../api'

const picked = z.object({ id: z.string(), name: z.string(), hint: z.string().optional() })

const schema = z
  .object({
    customer: picked.nullable(),
    service: picked.nullable(),
    project: picked.nullable(),
    employee: picked.nullable(),
    contractValue: z.string().min(1, 'Enter the contract value').refine((value) => Number(value) >= 0, 'The value cannot be negative'),
    currency: z.string().min(1, 'Enter a currency'),
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
    startDate: z.string().min(1, 'Choose the start date'),
    endDate: z.string().min(1, 'Choose the end date'),
    status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWAL_PENDING']),
    terms: z.string(),
    notes: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.customer) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customer'], message: 'Choose a customer' })
    }
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before start date' })
    }
  })
type FormValues = z.infer<typeof schema>

/** Creates or edits an annual maintenance contract. The customer, project, service and employee are chosen by name. */
export function AmcFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)
  const [failure, setFailure] = useState<string | null>(null)

  const existing = useQuery({ ...amcContractDetailQuery(id!), enabled: isEdit })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing.data
      ? {
          customer: { id: existing.data.customerId, name: existing.data.customerName ?? 'Customer' },
          service: existing.data.serviceOfferingId ? { id: existing.data.serviceOfferingId, name: existing.data.serviceName ?? 'Service' } : null,
          project: existing.data.projectId ? { id: existing.data.projectId, name: existing.data.projectTitle ?? 'Project' } : null,
          employee: existing.data.assignedEmployeeId ? { id: existing.data.assignedEmployeeId, name: existing.data.assignedEmployeeName ?? 'Employee' } : null,
          contractValue: String(existing.data.contractValue),
          currency: existing.data.currency,
          frequency: existing.data.frequency,
          startDate: existing.data.startDate,
          endDate: existing.data.endDate,
          status: existing.data.status,
          terms: existing.data.terms ?? '',
          notes: existing.data.notes ?? '',
        }
      : undefined,
    defaultValues: {
      customer: null,
      service: null,
      project: null,
      employee: null,
      contractValue: '',
      currency: 'INR',
      frequency: 'YEARLY',
      startDate: '',
      endDate: '',
      status: 'DRAFT',
      terms: '',
      notes: '',
    },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateAmcContractPayload & { status?: AmcStatus } = {
        customerId: values.customer!.id,
        serviceOfferingId: values.service?.id,
        projectId: values.project?.id,
        contractValue: Number(values.contractValue),
        currency: values.currency,
        startDate: values.startDate,
        endDate: values.endDate,
        frequency: values.frequency,
        assignedEmployeeId: values.employee?.id,
        // The form has no SLA field; sending the contract's own back keeps an existing link from being wiped by an edit.
        slaId: existing.data?.slaId ?? undefined,
        terms: values.terms || undefined,
        notes: values.notes || undefined,
        status: isEdit ? values.status : undefined,
      }
      return isEdit ? updateAmcContract(id!, payload) : createAmcContract(payload)
    },
    onSuccess: (contract) => {
      void queryClient.invalidateQueries({ queryKey: amcKeys.lists() })
      if (isEdit) void queryClient.invalidateQueries({ queryKey: amcKeys.detail(id!) })
      navigate(`/amc-contracts/${contract.id}`)
    },
    onError: (error) => setFailure(error instanceof ApiError ? error.message : 'The contract could not be saved. Try again.'),
  })

  if (isEdit && existing.isPending) return <SkeletonLoader variant="page" label="Loading the contract" />
  if (isEdit && existing.isError) return <ErrorState title="Could not load this contract" error={existing.error} onRetry={() => void existing.refetch()} />

  return (
    <div className="grid gap-4">
      <PageHeader
        title={isEdit ? 'Edit AMC contract' : 'New AMC contract'}
        back={{ to: isEdit ? `/amc-contracts/${id}` : '/amc-contracts', label: isEdit ? 'Contract' : 'AMC contracts' }}
        description="A maintenance contract covers a customer's installation for a period, for a fixed fee."
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
              <CardTitle>Who and what</CardTitle>
              <CardDescription>The customer the contract is with, and what it covers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <EntityPickerField control={form.control} name="customer" label="Customer" required>
                {(field) => <CustomerPicker {...field} />}
              </EntityPickerField>
              <EntityPickerField control={form.control} name="service" label="Service">
                {(field) => <ServicePicker {...field} />}
              </EntityPickerField>
              <EntityPickerField control={form.control} name="project" label="Project">
                {(field) => <ProjectPicker {...field} />}
              </EntityPickerField>
              <EntityPickerField control={form.control} name="employee" label="Looked after by">
                {(field) => <EmployeePicker {...field} />}
              </EntityPickerField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Period and fee</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contractValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract value</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service visits</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {AMC_FREQUENCIES.map((option) => (
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
              {isEdit ? (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {AMC_STATUSES.map((option) => (
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
              ) : null}
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
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms and notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="What the contract covers and what it does not" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal notes</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="For your team only" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to={isEdit ? `/amc-contracts/${id}` : '/amc-contracts'}>Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Create contract'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
