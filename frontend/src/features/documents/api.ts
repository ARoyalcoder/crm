import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// These lists must match the backend enums in document.api.

export const DOCUMENT_ENTITY_TYPES = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'QUOTATION', label: 'Quotation' },
  { value: 'ORDER', label: 'Order' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'TICKET', label: 'Ticket' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'AMC_CONTRACT', label: 'AMC Contract' },
  { value: 'WARRANTY', label: 'Warranty' },
] as const

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number]['value']

export const DOCUMENT_CATEGORIES = [
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'REPORT', label: 'Report' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'INVOICE_DOCUMENT', label: 'Invoice document' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'OTHER', label: 'Other' },
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]['value']

/** Maximum upload size enforced client-side (mirrors the 50 MB backend limit). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

/** MIME types the backend accepts. */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'application/zip',
  'text/plain',
  'text/csv',
]

export function labelOf(options: readonly { value: string; label: string }[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

// ---------------------------------------------------------------------------- schemas

const documentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  originalFileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  documentVersion: z.number(),
  uploadedBy: z.string(),
  uploadedByName: z.string().nullish(),
  tags: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type DocumentRecord = z.infer<typeof documentSchema>

const documentListItemSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  category: z.string(),
  title: z.string(),
  originalFileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  documentVersion: z.number(),
  uploadedBy: z.string(),
  uploadedByName: z.string().nullish(),
  createdAt: z.string(),
})
export type DocumentListItem = z.infer<typeof documentListItemSchema>

const documentVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  versionNumber: z.number(),
  originalFileName: z.string(),
  fileSizeBytes: z.number(),
  uploadedBy: z.string(),
  uploadedByName: z.string().nullish(),
  uploadedAt: z.string(),
  notes: z.string().nullish(),
})
export type DocumentVersion = z.infer<typeof documentVersionSchema>

const downloadUrlSchema = z.object({
  url: z.string(),
  expiresAt: z.string(),
})
export type DownloadUrl = z.infer<typeof downloadUrlSchema>

const storageSummarySchema = z.object({
  totalFiles: z.number(),
  totalSizeBytes: z.number(),
})
export type StorageSummary = z.infer<typeof storageSummarySchema>

// ---------------------------------------------------------------------------- query keys

export const documentKeys = {
  all: ['documents'] as const,
  byEntity: (entityType: string, entityId: string) =>
    ['documents', 'entity', entityType, entityId] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
  versions: (id: string) => ['documents', 'detail', id, 'versions'] as const,
  mine: () => ['documents', 'mine'] as const,
  org: (entityType?: string) => ['documents', 'org', entityType ?? 'all'] as const,
  summary: () => ['documents', 'storage-summary'] as const,
}

// ---------------------------------------------------------------------------- queries

export function documentsByEntityQuery(entityType: string, entityId: string) {
  return queryOptions({
    queryKey: documentKeys.byEntity(entityType, entityId),
    queryFn: ({ signal }) =>
      apiRequest(`/documents/entity/${entityType}/${entityId}`, z.array(documentSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function documentQuery(id: string) {
  return queryOptions({
    queryKey: documentKeys.detail(id),
    queryFn: ({ signal }) => apiRequest(`/documents/${id}`, documentSchema, { signal }),
  })
}

export function documentVersionsQuery(id: string) {
  return queryOptions({
    queryKey: documentKeys.versions(id),
    queryFn: ({ signal }) => apiRequest(`/documents/${id}/versions`, z.array(documentVersionSchema), { signal }),
  })
}

export function myDocumentsQuery() {
  return queryOptions({
    queryKey: documentKeys.mine(),
    queryFn: ({ signal }) => apiRequest('/documents/mine', z.array(documentListItemSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function allDocumentsQuery(entityType?: string) {
  const params = entityType ? `?entityType=${entityType}` : ''
  return queryOptions({
    queryKey: documentKeys.org(entityType),
    queryFn: ({ signal }) =>
      apiRequest(`/documents${params}`, z.array(documentListItemSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function storageSummaryQuery() {
  return queryOptions({
    queryKey: documentKeys.summary(),
    queryFn: ({ signal }) => apiRequest('/documents/storage-summary', storageSummarySchema, { signal }),
  })
}

// ---------------------------------------------------------------------------- mutations

export type UploadDocumentInput = {
  file: File
  entityType: string
  entityId: string
  category: string
  title: string
  description?: string
  tags?: string
}

export function uploadDocument(input: UploadDocumentInput): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', input.file)
  form.append('entityType', input.entityType)
  form.append('entityId', input.entityId)
  form.append('category', input.category)
  form.append('title', input.title)
  if (input.description) form.append('description', input.description)
  if (input.tags) form.append('tags', input.tags)
  return apiRequest('/documents/upload', documentSchema, { method: 'POST', body: form })
}

export type UploadNewVersionInput = {
  documentId: string
  file: File
  notes?: string
}

export function uploadNewVersion(input: UploadNewVersionInput): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', input.file)
  if (input.notes) form.append('notes', input.notes)
  return apiRequest(`/documents/${input.documentId}/version`, documentSchema, {
    method: 'POST',
    body: form,
  })
}

export function deleteDocument(id: string): Promise<undefined> {
  return apiRequest(`/documents/${id}`, z.undefined(), { method: 'DELETE' })
}

export function getDownloadUrl(id: string): Promise<DownloadUrl> {
  return apiRequest(`/documents/${id}/download`, downloadUrlSchema)
}
