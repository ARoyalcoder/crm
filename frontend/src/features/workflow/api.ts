import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { pageSchema, queryString } from '@/lib/api/page'

// ------------------------------------------------------------------ keys

export const workflowKeys = {
  all: ['workflow'] as const,
  rules: (status?: string) => [...workflowKeys.all, 'rules', status] as const,
  rule: (id: string) => [...workflowKeys.all, 'rule', id] as const,
  ruleLog: (id: string, page: number, size: number) =>
    [...workflowKeys.all, 'rule-log', id, page, size] as const,
  orgLog: (page: number, size: number) => [...workflowKeys.all, 'org-log', page, size] as const,
}

export function refreshWorkflow(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: workflowKeys.all })
}

// ------------------------------------------------------------------ constants

export const WORKFLOW_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
] as const

export const CONDITION_OPERATORS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Not equals' },
  { value: 'GREATER_THAN', label: 'Greater than' },
  { value: 'LESS_THAN', label: 'Less than' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'IS_NULL', label: 'Is empty' },
  { value: 'IS_NOT_NULL', label: 'Is not empty' },
] as const

export const ACTION_TYPES = [
  { value: 'CREATE_COLLECTION_TASK', label: 'Create collection task' },
  { value: 'SEND_NOTIFICATION', label: 'Send notification' },
  { value: 'CREATE_ACTIVITY_TASK', label: 'Create activity task' },
  { value: 'LOG_ONLY', label: 'Log only' },
] as const

export const BUSINESS_EVENT_TYPES = [
  { value: 'LEAD_CREATED', label: 'Lead created' },
  { value: 'LEAD_QUALIFIED', label: 'Lead qualified' },
  { value: 'LEAD_CONVERTED', label: 'Lead converted' },
  { value: 'QUOTE_CREATED', label: 'Quote created' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote accepted' },
  { value: 'QUOTE_REJECTED', label: 'Quote rejected' },
  { value: 'ORDER_CREATED', label: 'Order created' },
  { value: 'ORDER_CONFIRMED', label: 'Order confirmed' },
  { value: 'ORDER_CANCELLED', label: 'Order cancelled' },
  { value: 'PROJECT_STARTED', label: 'Project started' },
  { value: 'PROJECT_COMPLETED', label: 'Project completed' },
  { value: 'PROJECT_DELAYED', label: 'Project delayed' },
  { value: 'TASK_COMPLETED', label: 'Task completed' },
  { value: 'MILESTONE_REACHED', label: 'Milestone reached' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment received' },
  { value: 'PAYMENT_OVERDUE', label: 'Payment overdue' },
  { value: 'INVOICE_ISSUED', label: 'Invoice issued' },
  { value: 'INVOICE_CANCELLED', label: 'Invoice cancelled' },
  { value: 'TICKET_CREATED', label: 'Ticket created' },
  { value: 'TICKET_RESOLVED', label: 'Ticket resolved' },
  { value: 'TICKET_SLA_BREACHED', label: 'Ticket SLA breached' },
  { value: 'AMC_EXPIRING', label: 'AMC Expiring' },
  { value: 'AMC_RENEWED', label: 'AMC Renewed' },
  { value: 'AMC_EXPIRED', label: 'AMC Expired' },
  { value: 'WARRANTY_CLAIMED', label: 'Warranty claimed' },
  { value: 'ATTENDANCE_MARKED', label: 'Attendance marked' },
  { value: 'VENDOR_ADDED', label: 'Vendor added' },
  { value: 'USER_CREATED', label: 'User created' },
  { value: 'USER_DEACTIVATED', label: 'User deactivated' },
] as const

export const EXECUTION_STATUSES = [
  { value: 'TRIGGERED', label: 'Triggered' },
  { value: 'CONDITION_MET', label: 'Condition met' },
  { value: 'CONDITION_NOT_MET', label: 'Condition not met' },
  { value: 'ACTION_EXECUTED', label: 'Executed' },
  { value: 'ACTION_FAILED', label: 'Failed' },
] as const

// ------------------------------------------------------------------ schemas

const workflowRuleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  status: z.string(),
  triggerEventType: z.string(),
  conditions: z.string().nullish(),
  actions: z.string(),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type WorkflowRule = z.infer<typeof workflowRuleSchema>

const executionLogSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  ruleId: z.string(),
  triggerEventId: z.string().nullish(),
  status: z.string(),
  conditionsResult: z.string().nullish(),
  actionsResult: z.string().nullish(),
  errorMessage: z.string().nullish(),
  executedAt: z.string(),
  createdAt: z.string(),
})
export type ExecutionLog = z.infer<typeof executionLogSchema>

// ------------------------------------------------------------------ query options

export function workflowRulesQuery(status?: string) {
  return queryOptions({
    queryKey: workflowKeys.rules(status),
    queryFn: ({ signal }) =>
      apiRequest(`/workflow-rules${queryString({ status })}`, z.array(workflowRuleSchema), { signal }),
  })
}

export function workflowRuleQuery(id: string) {
  return queryOptions({
    queryKey: workflowKeys.rule(id),
    queryFn: ({ signal }) => apiRequest(`/workflow-rules/${id}`, workflowRuleSchema, { signal }),
  })
}

export function ruleExecutionLogQuery(id: string, page = 0, size = 20) {
  return queryOptions({
    queryKey: workflowKeys.ruleLog(id, page, size),
    queryFn: ({ signal }) =>
      apiRequest(
        `/workflow-rules/${id}/execution-log${queryString({ page, size })}`,
        pageSchema(executionLogSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

export function orgExecutionLogQuery(page = 0, size = 20) {
  return queryOptions({
    queryKey: workflowKeys.orgLog(page, size),
    queryFn: ({ signal }) =>
      apiRequest(
        `/workflow-rules/execution-log${queryString({ page, size })}`,
        pageSchema(executionLogSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

// ------------------------------------------------------------------ mutations

export type SaveRuleInput = {
  name: string
  description?: string | null
  status?: string | null
  triggerEventType: string
  conditions?: string | null
  actions: string
}

export function createWorkflowRule(input: SaveRuleInput) {
  return apiRequest('/workflow-rules', workflowRuleSchema, { method: 'POST', body: input })
}

export function updateWorkflowRule(id: string, input: SaveRuleInput) {
  return apiRequest(`/workflow-rules/${id}`, workflowRuleSchema, { method: 'PUT', body: input })
}

export function deleteWorkflowRule(id: string) {
  return apiRequest(`/workflow-rules/${id}`, z.undefined(), { method: 'DELETE' })
}

export function enableWorkflowRule(id: string) {
  return apiRequest(`/workflow-rules/${id}/enable`, workflowRuleSchema, { method: 'PUT' })
}

export function disableWorkflowRule(id: string) {
  return apiRequest(`/workflow-rules/${id}/disable`, workflowRuleSchema, { method: 'PUT' })
}

// ------------------------------------------------------------------ label helpers

export function workflowStatusLabel(value: string) {
  return WORKFLOW_STATUSES.find((s) => s.value === value)?.label ?? value
}

export function eventTypeLabel(value: string) {
  return BUSINESS_EVENT_TYPES.find((e) => e.value === value)?.label ?? value
}

export function executionStatusLabel(value: string) {
  return EXECUTION_STATUSES.find((s) => s.value === value)?.label ?? value
}
