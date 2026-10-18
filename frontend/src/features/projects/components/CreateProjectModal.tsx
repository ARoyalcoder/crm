import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { pickedOption } from '@/components/shared/picker-schema'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ServicePicker } from '@/features/catalog/components/ServicePicker'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { EmployeePicker } from '@/features/workforce/components/EmployeePicker'
import { projectsApi } from '../api'
import { PROJECT_PRIORITIES } from '../lib'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Give the project a title').max(250, 'Maximum 250 characters'),
    description: z.string(),
    customer: pickedOption.nullable(),
    service: pickedOption.nullable(),
    manager: pickedOption.nullable(),
    status: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    startDate: z.string(),
    expectedCompletionDate: z.string(),
    budget: z.string().refine((value) => value === '' || Number(value) >= 0, 'The budget cannot be negative'),
    revenue: z.string().refine((value) => value === '' || Number(value) >= 0, 'The revenue cannot be negative'),
    notes: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.customer) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customer'], message: 'Choose a customer' })
    }
    if (values.startDate && values.expectedCompletionDate && values.expectedCompletionDate < values.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['expectedCompletionDate'], message: 'Expected date cannot be before start date' })
    }
  })
type FormValues = z.infer<typeof schema>

type CreateProjectModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Started from a customer's page: the customer is already known and cannot be changed here. */
  initialCustomerId?: string
  initialCustomerName?: string
}

/** Starts a project: who it is for, what it is, who runs it and the dates and money it starts with. */
export function CreateProjectModal({ open, onOpenChange, initialCustomerId, initialCustomerName }: CreateProjectModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const statuses = useQuery(projectsApi.statusesQuery())

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      customer: initialCustomerId ? { id: initialCustomerId, name: initialCustomerName ?? 'Customer' } : null,
      service: null,
      manager: null,
      status: '',
      priority: 'MEDIUM',
      startDate: '',
      expectedCompletionDate: '',
      budget: '',
      revenue: '',
      notes: '',
    },
  })

  const create = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.createProject({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        customerId: values.customer!.id,
        customerName: values.customer!.name,
        serviceId: values.service?.id,
        serviceName: values.service?.name,
        projectManagerId: values.manager?.data?.userId,
        startDate: values.startDate || undefined,
        expectedCompletionDate: values.expectedCompletionDate || undefined,
        status: values.status || undefined,
        priority: values.priority,
        budget: values.budget ? Number(values.budget) : 0,
        revenue: values.revenue ? Number(values.revenue) : 0,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
      navigate(`/projects/${project.id}`)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) form.reset()
          onOpenChange(next)
        }}
        title="New project"
        description="Add milestones, tasks and the team afterwards."
        submitLabel="Create project"
        size="lg"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
        submitting={create.isPending}
        error={create.error}
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="10 kW commercial solar installation" {...field} />
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
                <Textarea rows={2} placeholder="A short summary of the scope" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EntityPickerField control={form.control} name="customer" label="Customer" required>
            {(field) => <CustomerPicker {...field} disabled={Boolean(initialCustomerId)} />}
          </EntityPickerField>
          <EntityPickerField control={form.control} name="service" label="Service">
            {(field) => <ServicePicker {...field} />}
          </EntityPickerField>
          <EntityPickerField control={form.control} name="manager" label="Project manager">
            {(field) => <EmployeePicker {...field} />}
          </EntityPickerField>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starting status</FormLabel>
                <FormControl>
                  <Select {...field}>
                    <option value="">Default</option>
                    {statuses.data?.map((status) => (
                      <option key={status.code} value={status.code}>
                        {status.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
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
            name="expectedCompletionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected completion</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (₹)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="revenue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revenue (₹)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Anything the team should know" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
