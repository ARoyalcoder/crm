import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

/** One record behind an answer: what it is, a line about it, and where to open it. */
const askRecordSchema = z.object({
  id: z.string().nullish(),
  title: z.string(),
  detail: z.string().nullish(),
  url: z.string().nullish(),
})

const askResponseSchema = z.object({
  question: z.string(),
  answer: z.string(),
  /** How the answer was worked out, in words. */
  reasoning: z.string().nullish(),
  /** The first few of the records behind the answer. */
  supportingRecords: z.array(askRecordSchema),
  /** How many records there are in all (the list above may be shorter). */
  totalRecords: z.number(),
  recommendedAction: z.string().nullish(),
  recommendedActionUrl: z.string().nullish(),
})

export type AskResponse = z.infer<typeof askResponseSchema>
export type AskRecord = z.infer<typeof askRecordSchema>

export function ask(question: string): Promise<AskResponse> {
  return apiRequest('/ask', askResponseSchema, { method: 'POST', body: { question } })
}

const suggestionSchema = z.object({ tool: z.string(), question: z.string() })
export type AskSuggestion = z.infer<typeof suggestionSchema>

/** The questions this person can ask: those whose records they may see. */
export const askSuggestionsQuery = queryOptions({
  queryKey: ['ask', 'suggestions'],
  staleTime: 10 * 60 * 1000,
  queryFn: ({ signal }) => apiRequest('/ask/suggestions', z.array(suggestionSchema), { signal }),
})
