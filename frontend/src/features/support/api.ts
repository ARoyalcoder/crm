import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { pageSchema, queryString } from '@/lib/api/page'

// These lists must match the backend enums in support.api.

export const TICKET_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING_CUSTOMER', label: 'Waiting customer' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
] as const

export const TICKET_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const

export const SLA_BREACH_STATUSES = [
  { value: 'ON_TRACK', label: 'On track' },
  { value: 'AT_RISK', label: 'At risk' },
  { value: 'BREACHED', label: 'Breached' },
  { value: 'NOT_APPLICABLE', label: 'No SLA' },
] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]['value']
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]['value']
export type SlaBreachStatus = (typeof SLA_BREACH_STATUSES)[number]['value']

// ------------------------------------------------------------------ schemas

const ticketSummarySchema = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  customerName: z.string(),
  customerId: z.string().nullish(),
  subject: z.string(),
  priority: z.string(),
  status: z.string(),
  assignedUserId: z.string().nullish(),
  assignedUserName: z.string().nullish(),
  createdAt: z.string(),
  dueAt: z.string().nullish(),
  slaBreachStatus: z.string(),
})
export type TicketSummary = z.infer<typeof ticketSummarySchema>

const commentRowSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  body: z.string(),
  internal: z.boolean(),
  createdAt: z.string(),
})
export type CommentRow = z.infer<typeof commentRowSchema>

const attachmentRowSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  uploadedByName: z.string(),
  createdAt: z.string(),
})
export type AttachmentRow = z.infer<typeof attachmentRowSchema>

const statusHistoryRowSchema = z.object({
  id: z.string(),
  fromStatus: z.string().nullish(),
  toStatus: z.string(),
  changedByName: z.string(),
  changedAt: z.string(),
  note: z.string().nullish(),
})
export type StatusHistoryRow = z.infer<typeof statusHistoryRowSchema>

const ticketDetailSchema = z.object({
  ticket: ticketSummarySchema,
  description: z.string().nullish(),
  projectId: z.string().nullish(),
  serviceOfferingId: z.string().nullish(),
  firstResponseAt: z.string().nullish(),
  resolvedAt: z.string().nullish(),
  comments: z.array(commentRowSchema),
  attachments: z.array(attachmentRowSchema),
  statusHistory: z.array(statusHistoryRowSchema),
  version: z.number(),
})
export type TicketDetail = z.infer<typeof ticketDetailSchema>

const slaSchema = z.object({
  id: z.string(),
  name: z.string(),
  responseTimeHours: z.number(),
  resolutionTimeHours: z.number(),
  priority: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Sla = z.infer<typeof slaSchema>

// ------------------------------------------------------------------ query keys

export const ticketKeys = {
  all: ['tickets'] as const,
  detail: (id: string) => ['tickets', 'detail', id] as const,
}

export const slaKeys = {
  all: ['sla'] as const,
}

// ------------------------------------------------------------------ ticket queries

export type TicketFilters = {
  search?: string
  status?: string
  priority?: string
  assignedUserId?: string
  customerId?: string
  page?: number
}

export function ticketsQuery(filters: TicketFilters) {
  return queryOptions({
    queryKey: [...ticketKeys.all, 'list', filters],
    queryFn: ({ signal }) =>
      apiRequest(`/tickets${queryString(filters)}`, pageSchema(ticketSummarySchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function ticketQuery(id: string) {
  return queryOptions({
    queryKey: ticketKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/tickets/${id}`, ticketDetailSchema, { signal }),
  })
}

// ------------------------------------------------------------------ ticket mutations

export type TicketInput = {
  customerId?: string | null
  customerName: string
  projectId?: string | null
  serviceOfferingId?: string | null
  subject: string
  description?: string | null
  priority: string
  slaId?: string | null
}

export function createTicket(input: TicketInput) {
  return apiRequest('/tickets', ticketDetailSchema, { method: 'POST', body: input })
}

export function updateTicket(id: string, input: TicketInput) {
  return apiRequest(`/tickets/${id}`, ticketDetailSchema, { method: 'PUT', body: input })
}

export function assignTicket(id: string, assignedUserId: string, assignedUserName: string, note?: string) {
  return apiRequest(`/tickets/${id}/assign`, ticketDetailSchema, {
    method: 'POST',
    body: { assignedUserId, assignedUserName, note },
  })
}

export function resolveTicket(id: string, note?: string) {
  return apiRequest(`/tickets/${id}/resolve`, ticketDetailSchema, {
    method: 'POST',
    body: { status: 'RESOLVED', note },
  })
}

export function closeTicket(id: string, note?: string) {
  return apiRequest(`/tickets/${id}/close`, ticketDetailSchema, {
    method: 'POST',
    body: { status: 'CLOSED', note },
  })
}

export function changeTicketStatus(id: string, status: string, note?: string) {
  return apiRequest(`/tickets/${id}/status`, ticketDetailSchema, {
    method: 'POST',
    body: { status, note },
  })
}

export function addComment(ticketId: string, body: string, internal: boolean) {
  return apiRequest(`/tickets/${ticketId}/comments`, commentRowSchema, {
    method: 'POST',
    body: { body, internal },
  })
}

// ------------------------------------------------------------------ SLA queries

export const slasQuery = queryOptions({
  queryKey: slaKeys.all,
  queryFn: ({ signal }) => apiRequest('/sla', z.array(slaSchema), { signal }),
})

// ------------------------------------------------------------------ SLA mutations

export type SlaInput = {
  name: string
  responseTimeHours: number
  resolutionTimeHours: number
  priority: string
  active: boolean
}

export function createSla(input: SlaInput) {
  return apiRequest('/sla', slaSchema, { method: 'POST', body: input })
}

export function updateSla(id: string, input: SlaInput) {
  return apiRequest(`/sla/${id}`, slaSchema, { method: 'PUT', body: input })
}

export function deleteSla(id: string) {
  return apiRequest(`/sla/${id}`, z.undefined(), { method: 'DELETE' })
}

// ------------------------------------------------------------------ helpers

export function labelOf(options: readonly { value: string; label: string }[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}
