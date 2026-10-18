import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// ------------------------------------------------------------------ constants

export const INSIGHT_TYPES = [
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'RISK', label: 'Risk' },
  { value: 'NEXT_BEST_ACTION', label: 'Next best action' },
] as const

export const INSIGHT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ACTIONED', label: 'Actioned' },
] as const

// ------------------------------------------------------------------ schemas

const insightRowSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: z.string(),
  category: z.string(),
  status: z.string(),
  title: z.string(),
  whatHappened: z.string(),
  whyItMatters: z.string(),
  whoShouldAct: z.string().nullish(),
  whoShouldActLabel: z.string().nullish(),
  whatToDo: z.string(),
  expectedImpact: z.string().nullish(),
  entityType: z.string().nullish(),
  entityId: z.string().nullish(),
  entityLabel: z.string().nullish(),
  score: z.number(),
  generatedAt: z.string(),
  expiresAt: z.string().nullish(),
})
export type InsightRow = z.infer<typeof insightRowSchema>

const pageSchema = (itemSchema: z.ZodTypeAny) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number(),
    size: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  })

const insightPageSchema = pageSchema(insightRowSchema)
export type InsightPage = z.infer<typeof insightPageSchema>

const pulseStatsSchema = z.object({
  risks: z.number(),
  opportunities: z.number(),
  actions: z.number(),
  achievements: z.number(),
})
export type PulseStats = z.infer<typeof pulseStatsSchema>

// ------------------------------------------------------------------ query keys

export const pulseKeys = {
  all: ['pulse'] as const,
  stats: ['pulse', 'stats'] as const,
}

// ------------------------------------------------------------------ queries

export type PulseKind = 'feed' | 'risks' | 'opportunities' | 'achievements' | 'actions'

/** One page of insights of a kind: the whole feed, or only risks, opportunities, achievements or next actions. */
export function pulseListQuery(kind: PulseKind, page = 0) {
  return queryOptions({
    queryKey: ['pulse', kind, page] as const,
    queryFn: ({ signal }) => apiRequest(`/api/v1/pulse/${kind}?page=${page}&size=20`, insightPageSchema, { signal }),
    placeholderData: keepPreviousData,
  })
}

export const pulseFeedQuery = (page = 0) => pulseListQuery('feed', page)
export const pulseRisksQuery = (page = 0) => pulseListQuery('risks', page)
export const pulseOpportunitiesQuery = (page = 0) => pulseListQuery('opportunities', page)
export const pulseAchievementsQuery = (page = 0) => pulseListQuery('achievements', page)
export const pulseActionsQuery = (page = 0) => pulseListQuery('actions', page)

export function pulseStatsQuery() {
  return queryOptions({
    queryKey: pulseKeys.stats,
    queryFn: ({ signal }) => apiRequest('/api/v1/pulse/stats', pulseStatsSchema, { signal }),
  })
}

// ------------------------------------------------------------------ mutations

export function dismissInsight(id: string) {
  return apiRequest(`/api/v1/pulse/${id}/dismiss`, insightRowSchema, { method: 'PUT' })
}

export function actionInsight(id: string) {
  return apiRequest(`/api/v1/pulse/${id}/actioned`, insightRowSchema, { method: 'PUT' })
}

export function refreshPulse() {
  return apiRequest('/api/v1/pulse/refresh', z.undefined(), { method: 'POST' })
}
