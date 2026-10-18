import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// ---- Schemas ----

export const searchResultSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  status: z.string(),
  owner: z.string(),
  url: z.string(),
})
export type SearchResult = z.infer<typeof searchResultSchema>

// ---- Query Options & API calls ----

export const searchApi = {
  searchQuery: (q: string, types?: string[], limit = 20) =>
    queryOptions({
      queryKey: ['search', 'results', q, types, limit],
      queryFn: () => {
        const params = new URLSearchParams()
        if (q) params.set('q', q)
        if (types && types.length > 0) params.set('types', types.join(','))
        params.set('limit', String(limit))
        return apiRequest(`/api/v1/search?${params.toString()}`, z.array(searchResultSchema))
      },
      enabled: q.trim().length >= 2,
      staleTime: 10_000,
    }),

  recentQuery: () =>
    queryOptions({
      queryKey: ['search', 'recent'],
      queryFn: () => apiRequest('/api/v1/search/recent', z.array(z.string())),
      staleTime: 30_000,
    }),

  clearRecent: async (): Promise<void> =>
    apiRequest('/api/v1/search/recent', z.void(), { method: 'DELETE' }),
}

// ---- Entity type constants ----

export const ENTITY_TYPES = [
  'Customer',
  'Lead',
  'Opportunity',
  'Quotation',
  'Order',
  'Project',
  'Ticket',
  'Invoice',
  'Employee',
  'Vendor',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]
