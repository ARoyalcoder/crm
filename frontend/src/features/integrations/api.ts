import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { queryOptions } from '@tanstack/react-query'

const integrationSchema = z.object({
  id: z.string(),
  type: z.string(),
  providerName: z.string().nullable(),
  status: z.enum(['CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING', 'NOT_CONFIGURED']),
  enabled: z.boolean(),
  lastTestedAt: z.string().nullable(),
  lastError: z.string().nullable(),
})
export type Integration = z.infer<typeof integrationSchema>

export const integrationKeys = {
  all: ['integrations'] as const,
  detail: (type: string) => ['integrations', type] as const,
}

export const integrationsApi = {
  listQuery: () =>
    queryOptions({
      queryKey: integrationKeys.all,
      queryFn: () => apiRequest('/api/v1/integrations', z.array(integrationSchema)),
    }),
  detailQuery: (type: string) =>
    queryOptions({
      queryKey: integrationKeys.detail(type),
      queryFn: () => apiRequest(`/api/v1/integrations/${type}`, integrationSchema),
    }),
  upsertMutation: () => ({
    mutationFn: ({
      type,
      data,
    }: {
      type: string
      data: { providerName: string; configJson: string }
    }) =>
      apiRequest(`/api/v1/integrations/${type}`, integrationSchema, {
        method: 'PUT',
        body: data,
      }),
  }),
  testMutation: () => ({
    mutationFn: (type: string) =>
      apiRequest(`/api/v1/integrations/${type}/test`, integrationSchema, { method: 'POST' }),
  }),
  enableMutation: () => ({
    mutationFn: (type: string) =>
      apiRequest(`/api/v1/integrations/${type}/enable`, integrationSchema, { method: 'PUT' }),
  }),
  disableMutation: () => ({
    mutationFn: (type: string) =>
      apiRequest(`/api/v1/integrations/${type}/disable`, integrationSchema, { method: 'PUT' }),
  }),
}

export const INTEGRATION_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  GOOGLE_DRIVE: 'Google Drive',
  CALENDAR: 'Calendar',
  PAYMENT_GATEWAY: 'Payment gateway',
  MAPS: 'Maps',
  OBJECT_STORAGE: 'Object storage',
  WEBHOOK: 'Webhooks',
}

export const ALL_INTEGRATION_TYPES = [
  'EMAIL',
  'WHATSAPP',
  'GOOGLE_DRIVE',
  'CALENDAR',
  'PAYMENT_GATEWAY',
  'MAPS',
  'OBJECT_STORAGE',
  'WEBHOOK',
] as const
