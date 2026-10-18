import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { pageSchema, queryString } from '@/lib/api/page'

// ------------------------------------------------------------------ keys

export const receivablesKeys = {
  all: ['receivables'] as const,
  dashboard: () => [...receivablesKeys.all, 'dashboard'] as const,
  outstanding: (page: number, size: number) => [...receivablesKeys.all, 'outstanding', page, size] as const,
  overdue: (page: number, size: number) => [...receivablesKeys.all, 'overdue', page, size] as const,
  ageing: () => [...receivablesKeys.all, 'ageing'] as const,
  tasks: (status: string | undefined, page: number, size: number) =>
    [...receivablesKeys.all, 'tasks', status, page, size] as const,
  task: (id: string) => [...receivablesKeys.all, 'task', id] as const,
  config: () => [...receivablesKeys.all, 'config'] as const,
}

export function refreshReceivables(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: receivablesKeys.all })
}

// ------------------------------------------------------------------ schemas

const ageingBucketSchema = z.object({
  label: z.string(),
  fromDays: z.number(),
  toDays: z.number().nullish(),
  count: z.number(),
  amount: z.number(),
})
export type AgeingBucket = z.infer<typeof ageingBucketSchema>

const dashboardSchema = z.object({
  totalReceivable: z.number(),
  overdue: z.number(),
  dueToday: z.number(),
  dueThisWeek: z.number(),
  collectionRate: z.number(),
  ageingBuckets: z.array(ageingBucketSchema),
})
export type ReceivablesDashboard = z.infer<typeof dashboardSchema>

const invoiceRowSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().nullish(),
  customerId: z.string(),
  customerName: z.string(),
  dueDate: z.string().nullish(),
  outstanding: z.number(),
  status: z.string(),
  daysOverdue: z.number(),
})
export type InvoiceRow = z.infer<typeof invoiceRowSchema>

const taskRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.string().nullish(),
  customerId: z.string(),
  customerName: z.string(),
  assignedToUserId: z.string().nullish(),
  priority: z.string(),
  status: z.string(),
  dueDate: z.string().nullish(),
  notes: z.string().nullish(),
  completedAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type TaskRow = z.infer<typeof taskRowSchema>

const configSchema = z.object({
  id: z.string(),
  overdueDays1: z.number(),
  overdueDays2: z.number(),
  collectionTaskEnabled: z.boolean(),
  escalationEnabled: z.boolean(),
  escalationUserId: z.string().nullish(),
})
export type ReceivablesConfig = z.infer<typeof configSchema>

// Reuse the ageing schema from finance for the richer ageing endpoint
const ageingReportSchema = z.object({
  asOf: z.string(),
  buckets: z.array(z.object({ label: z.string(), fromDays: z.number().nullish(), toDays: z.number().nullish() })),
  totals: z.array(z.number()),
  total: z.number(),
  overdue: z.number(),
  customers: z.array(
    z.object({
      customerId: z.string(),
      customerName: z.string(),
      amounts: z.array(z.number()),
      total: z.number(),
      oldestDaysOverdue: z.number(),
      invoices: z.number(),
    }),
  ),
})
export type ReceivablesAgeingReport = z.infer<typeof ageingReportSchema>

// ------------------------------------------------------------------ query options

export const dashboardQuery = queryOptions({
  queryKey: receivablesKeys.dashboard(),
  queryFn: ({ signal }) => apiRequest('/receivables/dashboard', dashboardSchema, { signal }),
})

export function outstandingQuery(page = 0, size = 20) {
  return queryOptions({
    queryKey: receivablesKeys.outstanding(page, size),
    queryFn: ({ signal }) =>
      apiRequest(`/receivables/outstanding${queryString({ page, size })}`, pageSchema(invoiceRowSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function overdueQuery(page = 0, size = 20) {
  return queryOptions({
    queryKey: receivablesKeys.overdue(page, size),
    queryFn: ({ signal }) =>
      apiRequest(`/receivables/overdue${queryString({ page, size })}`, pageSchema(invoiceRowSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export const receivablesAgeingQuery = queryOptions({
  queryKey: receivablesKeys.ageing(),
  queryFn: ({ signal }) => apiRequest('/receivables/ageing', ageingReportSchema, { signal }),
})

export function collectionTasksQuery(status?: string, page = 0, size = 20) {
  return queryOptions({
    queryKey: receivablesKeys.tasks(status, page, size),
    queryFn: ({ signal }) =>
      apiRequest(`/receivables/collection-tasks${queryString({ status, page, size })}`, pageSchema(taskRowSchema), {
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function collectionTaskQuery(id: string) {
  return queryOptions({
    queryKey: receivablesKeys.task(id),
    queryFn: ({ signal }) => apiRequest(`/receivables/collection-tasks/${id}`, taskRowSchema, { signal }),
  })
}

export const receivablesConfigQuery = queryOptions({
  queryKey: receivablesKeys.config(),
  queryFn: ({ signal }) => apiRequest('/receivables/config', configSchema, { signal }),
})

// ------------------------------------------------------------------ mutations

export type CreateTaskInput = {
  invoiceId: string
  priority?: string | null
  assignedToUserId?: string | null
  dueDate?: string | null
  notes?: string | null
}

export function createCollectionTask(input: CreateTaskInput) {
  return apiRequest('/receivables/collection-tasks', taskRowSchema, { method: 'POST', body: input })
}

export type UpdateTaskInput = {
  priority?: string | null
  status?: string | null
  assignedToUserId?: string | null
  dueDate?: string | null
  notes?: string | null
}

export function updateCollectionTask(id: string, input: UpdateTaskInput) {
  return apiRequest(`/receivables/collection-tasks/${id}`, taskRowSchema, { method: 'PUT', body: input })
}

export type UpdateConfigInput = {
  overdueDays1: number
  overdueDays2: number
  collectionTaskEnabled: boolean
  escalationEnabled: boolean
  escalationUserId?: string | null
}

export function updateReceivablesConfig(input: UpdateConfigInput) {
  return apiRequest('/receivables/config', configSchema, { method: 'PUT', body: input })
}

// ------------------------------------------------------------------ label helpers

export const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const

export const TASK_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export function taskStatusLabel(value: string) {
  return TASK_STATUSES.find((s) => s.value === value)?.label ?? value
}

export function taskPriorityLabel(value: string) {
  return TASK_PRIORITIES.find((p) => p.value === value)?.label ?? value
}

/** Returns the ageing bucket label for a given days-overdue count. */
export function ageingBucketLabel(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Not due'
  if (daysOverdue <= 30) return '0–30 days'
  if (daysOverdue <= 60) return '31–60 days'
  if (daysOverdue <= 90) return '61–90 days'
  return 'Over 90 days'
}
