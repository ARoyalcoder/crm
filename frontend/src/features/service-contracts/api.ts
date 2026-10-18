import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { pageSchema, queryString } from '@/lib/api/page'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const WARRANTY_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'VOIDED', label: 'Voided' },
] as const
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number]['value']

export const AMC_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RENEWAL_PENDING', label: 'Renewal pending' },
] as const
export type AmcStatus = (typeof AMC_STATUSES)[number]['value']

export const AMC_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half yearly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const
export type AmcFrequency = (typeof AMC_FREQUENCIES)[number]['value']

export const RENEWAL_STATUSES = [
  { value: 'NOT_DUE', label: 'Not due' },
  { value: 'DUE_SOON', label: 'Due soon' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'RENEWED', label: 'Renewed' },
  { value: 'LAPSED', label: 'Lapsed' },
] as const
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number]['value']

export const VISIT_TYPES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'INSPECTION', label: 'Inspection' },
] as const
export type VisitType = (typeof VISIT_TYPES)[number]['value']

export const VISIT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'MISSED', label: 'Missed' },
] as const
export type VisitStatus = (typeof VISIT_STATUSES)[number]['value']

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const warrantySummarySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string(),
  customerName: z.string().nullish(),
  orderId: z.string().nullish(),
  projectId: z.string().nullish(),
  serviceOfferingId: z.string().nullish(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOIDED']),
  createdAt: z.string(),
  createdBy: z.string(),
})
export type WarrantySummary = z.infer<typeof warrantySummarySchema>

export const warrantyDetailSchema = warrantySummarySchema.extend({
  terms: z.string().nullish(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
})
export type WarrantyDetail = z.infer<typeof warrantyDetailSchema>

export const customerWarrantiesSchema = z.object({
  customerId: z.string(),
  warranties: z.array(warrantySummarySchema),
  activeCount: z.number(),
  expiredCount: z.number(),
})
export type CustomerWarranties = z.infer<typeof customerWarrantiesSchema>

export const visitViewSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  contractNumber: z.string().nullish(),
  customerName: z.string().nullish(),
  scheduledDate: z.string(),
  completedDate: z.string().nullish(),
  visitType: z.enum(['SCHEDULED', 'EMERGENCY', 'INSPECTION']),
  assignedEmployeeId: z.string().nullish(),
  assignedEmployeeName: z.string().nullish(),
  notes: z.string().nullish(),
  outcome: z.string().nullish(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']),
  createdAt: z.string(),
})
export type VisitView = z.infer<typeof visitViewSchema>

export const amcContractSummarySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contractNumber: z.string(),
  customerId: z.string(),
  customerName: z.string().nullish(),
  serviceOfferingId: z.string().nullish(),
  projectId: z.string().nullish(),
  contractValue: z.number(),
  currency: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
  assignedEmployeeId: z.string().nullish(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'RENEWAL_PENDING']),
  renewalStatus: z.enum(['NOT_DUE', 'DUE_SOON', 'OVERDUE', 'RENEWED', 'LAPSED']),
  renewedFromId: z.string().nullish(),
  createdAt: z.string(),
})
export type AmcContractSummary = z.infer<typeof amcContractSummarySchema>

export const amcContractDetailSchema = amcContractSummarySchema.extend({
  serviceName: z.string().nullish(),
  projectTitle: z.string().nullish(),
  assignedEmployeeName: z.string().nullish(),
  slaId: z.string().nullish(),
  terms: z.string().nullish(),
  notes: z.string().nullish(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
  visits: z.array(visitViewSchema),
})
export type AmcContractDetail = z.infer<typeof amcContractDetailSchema>

export const amcDashboardSchema = z.object({
  totalActive: z.number(),
  expiringSoon: z.number(),
  overdueRenewals: z.number(),
  upcomingVisits: z.number(),
  expiringSoonContracts: z.array(amcContractSummarySchema),
  upcomingVisitsList: z.array(visitViewSchema),
})
export type AmcDashboard = z.infer<typeof amcDashboardSchema>

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const warrantyKeys = {
  all: ['warranties'] as const,
  lists: () => [...warrantyKeys.all, 'list'] as const,
  list: (params: WarrantyListParams) => [...warrantyKeys.lists(), params] as const,
  details: () => [...warrantyKeys.all, 'detail'] as const,
  detail: (id: string) => [...warrantyKeys.details(), id] as const,
  customer: (customerId: string) => [...warrantyKeys.all, 'customer', customerId] as const,
}

export const amcKeys = {
  all: ['amc-contracts'] as const,
  lists: () => [...amcKeys.all, 'list'] as const,
  list: (params: AmcListParams) => [...amcKeys.lists(), params] as const,
  details: () => [...amcKeys.all, 'detail'] as const,
  detail: (id: string) => [...amcKeys.details(), id] as const,
  dashboard: () => [...amcKeys.all, 'dashboard'] as const,
  expiring: () => [...amcKeys.all, 'expiring'] as const,
  visits: (contractId: string) => [...amcKeys.all, 'visits', contractId] as const,
}

// ─── Param Types ──────────────────────────────────────────────────────────────

export type WarrantyListParams = {
  page?: number
  size?: number
}

export type AmcListParams = {
  status?: AmcStatus
  customerId?: string
  expiringInDays?: number
  page?: number
  size?: number
  sort?: string
}

// ─── Query Functions ──────────────────────────────────────────────────────────

export function warrantiesQuery(params: WarrantyListParams = {}) {
  const query = queryString({ page: params.page ?? 0, size: params.size ?? 20 })
  return queryOptions({
    queryKey: warrantyKeys.list(params),
    queryFn: () => apiRequest(`/api/v1/warranties${query}`, pageSchema(warrantySummarySchema)),
    placeholderData: keepPreviousData,
  })
}

export function warrantyDetailQuery(id: string) {
  return queryOptions({
    queryKey: warrantyKeys.detail(id),
    queryFn: () => apiRequest(`/api/v1/warranties/${id}`, warrantyDetailSchema),
  })
}

export function customerWarrantiesQuery(customerId: string) {
  return queryOptions({
    queryKey: warrantyKeys.customer(customerId),
    queryFn: () => apiRequest(`/api/v1/warranties/by-customer/${customerId}`, customerWarrantiesSchema),
  })
}

export function amcContractsQuery(params: AmcListParams = {}) {
  const query = queryString({
    status: params.status,
    customerId: params.customerId,
    expiringInDays: params.expiringInDays,
    page: params.page ?? 0,
    size: params.size ?? 20,
    sort: params.sort,
  })
  return queryOptions({
    queryKey: amcKeys.list(params),
    queryFn: () => apiRequest(`/api/v1/amc-contracts${query}`, pageSchema(amcContractSummarySchema)),
    placeholderData: keepPreviousData,
  })
}

export function amcContractDetailQuery(id: string) {
  return queryOptions({
    queryKey: amcKeys.detail(id),
    queryFn: () => apiRequest(`/api/v1/amc-contracts/${id}`, amcContractDetailSchema),
  })
}

export function amcDashboardQuery() {
  return queryOptions({
    queryKey: amcKeys.dashboard(),
    queryFn: () => apiRequest('/api/v1/amc-contracts/dashboard', amcDashboardSchema),
  })
}

export function amcExpiringQuery() {
  return queryOptions({
    queryKey: amcKeys.expiring(),
    queryFn: () => apiRequest('/api/v1/amc-contracts/expiring', z.array(amcContractSummarySchema)),
  })
}

export function amcVisitsQuery(contractId: string) {
  return queryOptions({
    queryKey: amcKeys.visits(contractId),
    queryFn: () => apiRequest(`/api/v1/amc-contracts/${contractId}/visits`, z.array(visitViewSchema)),
  })
}

// ─── Mutation Functions ────────────────────────────────────────────────────────

export type CreateWarrantyPayload = {
  customerId: string
  orderId?: string
  projectId?: string
  serviceOfferingId?: string
  description: string
  terms?: string
  startDate: string
  endDate: string
}

export async function createWarranty(data: CreateWarrantyPayload): Promise<WarrantyDetail> {
  return apiRequest('/api/v1/warranties', warrantyDetailSchema, { method: 'POST', body: data })
}

export async function updateWarranty(id: string, data: CreateWarrantyPayload & { status?: WarrantyStatus }): Promise<WarrantyDetail> {
  return apiRequest(`/api/v1/warranties/${id}`, warrantyDetailSchema, { method: 'PUT', body: data })
}

export async function deleteWarranty(id: string): Promise<void> {
  await apiRequest(`/api/v1/warranties/${id}`, z.void(), { method: 'DELETE' })
}

export type CreateAmcContractPayload = {
  customerId: string
  serviceOfferingId?: string
  projectId?: string
  contractValue: number
  currency?: string
  startDate: string
  endDate: string
  frequency: AmcFrequency
  assignedEmployeeId?: string
  slaId?: string
  terms?: string
  notes?: string
}

export async function createAmcContract(data: CreateAmcContractPayload): Promise<AmcContractDetail> {
  return apiRequest('/api/v1/amc-contracts', amcContractDetailSchema, { method: 'POST', body: data })
}

export async function updateAmcContract(id: string, data: CreateAmcContractPayload & { status?: AmcStatus }): Promise<AmcContractDetail> {
  return apiRequest(`/api/v1/amc-contracts/${id}`, amcContractDetailSchema, { method: 'PUT', body: data })
}

export type RenewContractPayload = {
  newEndDate: string
  newContractValue?: number
}

export async function renewAmcContract(id: string, data: RenewContractPayload): Promise<AmcContractDetail> {
  return apiRequest(`/api/v1/amc-contracts/${id}/renew`, amcContractDetailSchema, { method: 'POST', body: data })
}

export type CreateVisitPayload = {
  scheduledDate: string
  visitType?: VisitType
  assignedEmployeeId?: string
  notes?: string
}

export async function addServiceVisit(contractId: string, data: CreateVisitPayload): Promise<VisitView> {
  return apiRequest(`/api/v1/amc-contracts/${contractId}/visits`, visitViewSchema, { method: 'POST', body: data })
}

export type UpdateVisitPayload = {
  completedDate?: string
  outcome?: string
  status?: VisitStatus
}

export async function updateServiceVisit(visitId: string, data: UpdateVisitPayload): Promise<VisitView> {
  return apiRequest(`/api/v1/amc-service-visits/${visitId}`, visitViewSchema, { method: 'PUT', body: data })
}
