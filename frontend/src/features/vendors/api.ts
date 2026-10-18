import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

const noContent = z.undefined()

// These lists must match the backend enums in vendor.api.

export const VENDOR_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
] as const

export const PARTNER_ACCESS_LEVELS = [
  { value: 'READ_ONLY', label: 'Read only' },
  { value: 'ASSIGNED_PROJECTS', label: 'Assigned projects' },
  { value: 'LIMITED_OPERATIONS', label: 'Limited operations' },
] as const

export const VENDOR_RATING_CATEGORIES = [
  { value: 'QUALITY', label: 'Quality' },
  { value: 'COST', label: 'Cost' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'RESPONSE', label: 'Response' },
  { value: 'CUSTOMER_FEEDBACK', label: 'Customer feedback' },
] as const

export const VENDOR_DOCUMENT_TYPES = [
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'OTHER', label: 'Other' },
] as const

export function labelOf(options: readonly { value: string; label: string }[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

// ---------------------------------------------------------------------------- schemas

const vendorSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  companyName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  address: z.string().nullish(),
  services: z.string().nullish(),
  paymentTermsDays: z.number().nullish(),
  status: z.string(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
})
export type Vendor = z.infer<typeof vendorSchema>

const vendorContactSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  designation: z.string().nullish(),
  primaryContact: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type VendorContact = z.infer<typeof vendorContactSchema>

const vendorDocumentSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  documentType: z.string(),
  fileName: z.string(),
  storageKey: z.string(),
  mimeType: z.string().nullish(),
  fileSize: z.number().nullish(),
  uploadedBy: z.string(),
  createdAt: z.string(),
})
export type VendorDocument = z.infer<typeof vendorDocumentSchema>

const vendorScoreSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  category: z.string(),
  score: z.number(),
  reviewedBy: z.string(),
  notes: z.string().nullish(),
  scoredAt: z.string(),
})
export type VendorScore = z.infer<typeof vendorScoreSchema>

const scorecardSchema = z.object({
  categoryScores: z.record(z.string(), z.number()),
  overallAverage: z.number(),
})
export type Scorecard = z.infer<typeof scorecardSchema>

const partnerSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  accessLevel: z.string(),
  assignedProjectIds: z.string().nullish(),
  services: z.string().nullish(),
  active: z.boolean(),
  userId: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
})
export type Partner = z.infer<typeof partnerSchema>

// ---------------------------------------------------------------------------- query keys

export const vendorKeys = {
  all: ['vendors'] as const,
  detail: (id: string) => ['vendors', 'detail', id] as const,
  contacts: (id: string) => ['vendors', 'detail', id, 'contacts'] as const,
  documents: (id: string) => ['vendors', 'detail', id, 'documents'] as const,
  scorecard: (id: string) => ['vendors', 'detail', id, 'scorecard'] as const,
}

export const partnerKeys = {
  all: ['partners'] as const,
  detail: (id: string) => ['partners', 'detail', id] as const,
}

// ---------------------------------------------------------------------------- vendor queries

export type VendorFilters = { status?: string }

export function vendorsQuery(filters: VendorFilters = {}) {
  const params = filters.status ? `?status=${filters.status}` : ''
  return queryOptions({
    queryKey: [...vendorKeys.all, 'list', filters],
    queryFn: ({ signal }) => apiRequest(`/vendors${params}`, z.array(vendorSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function vendorQuery(id: string) {
  return queryOptions({
    queryKey: vendorKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/vendors/${id}`, vendorSchema, { signal }),
  })
}

export function vendorContactsQuery(vendorId: string) {
  return queryOptions({
    queryKey: vendorKeys.contacts(vendorId),
    queryFn: ({ signal }) => apiRequest(`/vendors/${vendorId}/contacts`, z.array(vendorContactSchema), { signal }),
  })
}

export function vendorDocumentsQuery(vendorId: string) {
  return queryOptions({
    queryKey: vendorKeys.documents(vendorId),
    queryFn: ({ signal }) => apiRequest(`/vendors/${vendorId}/documents`, z.array(vendorDocumentSchema), { signal }),
  })
}

export function scorecardQuery(vendorId: string) {
  return queryOptions({
    queryKey: vendorKeys.scorecard(vendorId),
    queryFn: ({ signal }) => apiRequest(`/vendors/${vendorId}/scorecard`, scorecardSchema, { signal }),
  })
}

// ---------------------------------------------------------------------------- vendor mutations

export type VendorInput = {
  companyName: string
  contactEmail: string
  contactPhone: string
  address: string | null
  services: string | null
  paymentTermsDays: number | null
  status: string
  notes: string | null
}

export function createVendor(input: VendorInput) {
  return apiRequest('/vendors', vendorSchema, { method: 'POST', body: input })
}

export function updateVendor(id: string, input: VendorInput & { version: number }) {
  return apiRequest(`/vendors/${id}`, vendorSchema, { method: 'PUT', body: input })
}

export function deleteVendor(id: string) {
  return apiRequest(`/vendors/${id}`, noContent, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------- contact mutations

export type VendorContactInput = {
  name: string
  email: string
  phone: string
  designation: string | null
  primaryContact: boolean
}

export function createVendorContact(vendorId: string, input: VendorContactInput) {
  return apiRequest(`/vendors/${vendorId}/contacts`, vendorContactSchema, { method: 'POST', body: input })
}

export function updateVendorContact(contactId: string, vendorId: string, input: VendorContactInput) {
  return apiRequest(`/vendor-contacts/${contactId}?vendorId=${vendorId}`, vendorContactSchema, {
    method: 'PUT',
    body: input,
  })
}

export function deleteVendorContact(contactId: string, vendorId: string) {
  return apiRequest(`/vendor-contacts/${contactId}?vendorId=${vendorId}`, noContent, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------- score mutations

export type VendorScoreInput = {
  category: string
  score: number
  notes: string | null
}

export function addVendorScore(vendorId: string, input: VendorScoreInput) {
  return apiRequest(`/vendors/${vendorId}/scores`, vendorScoreSchema, { method: 'POST', body: input })
}

// ---------------------------------------------------------------------------- document mutations

export type VendorDocumentInput = {
  documentType: string | null
  fileName: string
  storageKey: string
  mimeType: string | null
  fileSize: number | null
}

export function addVendorDocument(vendorId: string, input: VendorDocumentInput) {
  return apiRequest(`/vendors/${vendorId}/documents`, vendorDocumentSchema, { method: 'POST', body: input })
}

export function deleteVendorDocument(documentId: string, vendorId: string) {
  return apiRequest(`/vendor-documents/${documentId}?vendorId=${vendorId}`, noContent, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------- partner queries

export function partnersQuery() {
  return queryOptions({
    queryKey: [...partnerKeys.all, 'list'],
    queryFn: ({ signal }) => apiRequest('/partners', z.array(partnerSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function partnerQuery(id: string) {
  return queryOptions({
    queryKey: partnerKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/partners/${id}`, partnerSchema, { signal }),
  })
}

// ---------------------------------------------------------------------------- partner mutations

export type PartnerInput = {
  organizationName: string
  contactEmail: string
  contactPhone: string
  accessLevel: string
  assignedProjectIds: string | null
  services: string | null
  active: boolean
  userId: string | null
  notes: string | null
}

export function createPartner(input: PartnerInput) {
  return apiRequest('/partners', partnerSchema, { method: 'POST', body: input })
}

export function updatePartner(id: string, input: PartnerInput & { version: number }) {
  return apiRequest(`/partners/${id}`, partnerSchema, { method: 'PUT', body: input })
}

export function deletePartner(id: string) {
  return apiRequest(`/partners/${id}`, noContent, { method: 'DELETE' })
}
