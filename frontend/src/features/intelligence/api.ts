import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { pageSchema, queryString } from '@/lib/api/page'

// These lists must match the backend enums in intelligence.api.

export const CUSTOMER_SEGMENTS = [
  { value: 'HEALTHY', label: 'Healthy' },
  { value: 'AT_RISK', label: 'At risk' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'HIGH_VALUE', label: 'High value' },
  { value: 'NEW', label: 'New' },
] as const

export type CustomerSegmentValue = (typeof CUSTOMER_SEGMENTS)[number]['value']

export const SCORE_CONTRIBUTORS = [
  { value: 'PAYMENT_BEHAVIOUR', label: 'Payment behaviour', maxScore: 30 },
  { value: 'PROJECT_DELIVERY', label: 'Project delivery', maxScore: 20 },
  { value: 'SUPPORT_ACTIVITY', label: 'Support activity', maxScore: 15 },
  { value: 'AMC_STATUS', label: 'AMC Status', maxScore: 15 },
  { value: 'ENGAGEMENT', label: 'Engagement', maxScore: 10 },
  { value: 'PURCHASE_FREQUENCY', label: 'Purchase frequency', maxScore: 10 },
] as const

// ---------------------------------------------------------------------------- schemas

export const contributorScoreSchema = z.object({
  contributor: z.string(),
  score: z.number(),
  maxScore: z.number(),
  reason: z.string(),
})
export type ContributorScore = z.infer<typeof contributorScoreSchema>

export const intelligenceSnapshotSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  organizationId: z.string(),
  healthScore: z.number(),
  segment: z.string(),
  clv: z.number(),
  totalRevenue: z.number(),
  purchaseCount: z.number(),
  avgPurchaseValue: z.number(),
  activeProjects: z.number(),
  openTickets: z.number(),
  overdueInvoices: z.number(),
  hasActiveAmc: z.boolean(),
  lastInteractionDate: z.string().nullish(),
  daysSinceLastPurchase: z.number().nullish(),
  /** Raw JSON string of ContributorScore[]. Parse it on the client. */
  scoreBreakdown: z.string().nullish(),
  computedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type IntelligenceSnapshot = z.infer<typeof intelligenceSnapshotSchema>

export const intelligenceExplanationSchema = z.object({
  headline: z.string(),
  segment: z.string(),
  healthScore: z.number(),
  reasons: z.array(z.string()),
})
export type IntelligenceExplanation = z.infer<typeof intelligenceExplanationSchema>

export const orgIntelligenceSummarySchema = z.object({
  countBySegment: z.record(z.number()),
  avgHealthScore: z.number(),
})
export type OrgIntelligenceSummary = z.infer<typeof orgIntelligenceSummarySchema>

// ---------------------------------------------------------------------------- helpers

/** Parses the raw scoreBreakdown JSON string from the snapshot into a typed array. */
export function parseScoreBreakdown(raw: string | null | undefined): ContributorScore[] {
  if (!raw) return []
  try {
    return JSON.parse(raw) as ContributorScore[]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------- query keys

export const intelligenceKeys = {
  all: ['intelligence'] as const,
  summary: () => [...intelligenceKeys.all, 'summary'] as const,
  customers: (filters: IntelligenceListFilters) =>
    [...intelligenceKeys.all, 'customers', filters] as const,
  customer: (customerId: string) => [...intelligenceKeys.all, 'customer', customerId] as const,
  explanation: (customerId: string) =>
    [...intelligenceKeys.all, 'explanation', customerId] as const,
}

// ---------------------------------------------------------------------------- query hooks

export type IntelligenceListFilters = {
  segment?: string
  page?: number
}

export function intelligenceSummaryQuery() {
  return queryOptions({
    queryKey: intelligenceKeys.summary(),
    queryFn: ({ signal }) =>
      apiRequest('/intelligence/summary', orgIntelligenceSummarySchema, { signal }),
  })
}

export function intelligenceCustomersQuery(filters: IntelligenceListFilters) {
  return queryOptions({
    queryKey: intelligenceKeys.customers(filters),
    queryFn: ({ signal }) =>
      apiRequest(
        `/intelligence/customers${queryString(filters)}`,
        pageSchema(intelligenceSnapshotSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

export function customerIntelligenceQuery(customerId: string) {
  return queryOptions({
    queryKey: intelligenceKeys.customer(customerId),
    queryFn: ({ signal }) =>
      apiRequest(
        `/customers/${customerId}/intelligence`,
        intelligenceSnapshotSchema,
        { signal },
      ),
  })
}

export function customerIntelligenceExplanationQuery(customerId: string) {
  return queryOptions({
    queryKey: intelligenceKeys.explanation(customerId),
    queryFn: ({ signal }) =>
      apiRequest(
        `/customers/${customerId}/intelligence/explanation`,
        intelligenceExplanationSchema,
        { signal },
      ),
  })
}

export function refreshCustomerIntelligence(customerId: string) {
  return apiRequest(`/customers/${customerId}/intelligence/refresh`, intelligenceSnapshotSchema, {
    method: 'POST',
  })
}
