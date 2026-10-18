import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { queryOptions } from '@tanstack/react-query'

const briefItemSchema = z.object({
  label: z.string(),
  value: z.string(),
  detail: z.string().nullish(),
  actionUrl: z.string().nullish(),
  reason: z.string().nullish(),
})

const briefSectionSchema = z.object({
  title: z.string(),
  icon: z.string(),
  items: z.array(briefItemSchema),
})

const briefResponseSchema = z.object({
  role: z.string(),
  greeting: z.string(),
  sections: z.array(briefSectionSchema),
  date: z.string(),
})

export type BriefItem = z.infer<typeof briefItemSchema>
export type BriefSection = z.infer<typeof briefSectionSchema>
export type BriefResponse = z.infer<typeof briefResponseSchema>

export const briefApi = {
  dailyQuery: () =>
    queryOptions({
      queryKey: ['brief', 'daily'],
      queryFn: ({ signal }) => apiRequest('/brief/daily', briefResponseSchema, { signal }),
      staleTime: 5 * 60 * 1000,
    }),
}
