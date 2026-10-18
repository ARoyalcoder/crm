import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// ---- Enums ----

export const notificationTypeValues = [
  'INFO',
  'SUCCESS',
  'WARNING',
  'CRITICAL',
  'ACHIEVEMENT',
  'OPPORTUNITY',
  'RISK',
] as const
export type NotificationType = (typeof notificationTypeValues)[number]

// ---- Schemas ----

export const notificationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  recipientUserId: z.string(),
  type: z.enum(notificationTypeValues),
  title: z.string(),
  message: z.string(),
  entityType: z.string().nullish(),
  entityId: z.string().nullish(),
  read: z.boolean(),
  readAt: z.string().nullish(),
  createdAt: z.string(),
})
export type Notification = z.infer<typeof notificationSchema>

export const notificationPageSchema = z.object({
  content: z.array(notificationSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(),
  size: z.number(),
})
export type NotificationPage = z.infer<typeof notificationPageSchema>

export const unreadCountSchema = z.object({ count: z.number() })
export type UnreadCount = z.infer<typeof unreadCountSchema>

export const notificationPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  eventType: z.string(),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  updatedAt: z.string(),
})
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>

// ---- Query Options & Mutations ----

export const notificationsApi = {
  allQuery: (page = 0, size = 20) =>
    queryOptions({
      queryKey: ['notifications', 'all', page, size],
      queryFn: () =>
        apiRequest(`/api/v1/notifications?page=${page}&size=${size}`, notificationPageSchema),
    }),

  unreadQuery: () =>
    queryOptions({
      queryKey: ['notifications', 'unread'],
      queryFn: () => apiRequest('/api/v1/notifications/unread', z.array(notificationSchema)),
      refetchInterval: 30_000, // poll every 30 s for the bell
    }),

  unreadCountQuery: () =>
    queryOptions({
      queryKey: ['notifications', 'unread-count'],
      queryFn: () => apiRequest('/api/v1/notifications/unread-count', unreadCountSchema),
      refetchInterval: 30_000,
    }),

  preferencesQuery: () =>
    queryOptions({
      queryKey: ['notifications', 'preferences'],
      queryFn: () => apiRequest('/api/v1/notifications/preferences', z.array(notificationPreferenceSchema)),
    }),

  // Mutations
  markRead: async (id: string): Promise<Notification> =>
    apiRequest(`/api/v1/notifications/${id}/read`, notificationSchema, { method: 'PUT' }),

  markAllRead: async (): Promise<UnreadCount> =>
    apiRequest('/api/v1/notifications/read-all', unreadCountSchema, { method: 'PUT' }),

  updatePreference: async (
    eventType: string,
    data: { inAppEnabled: boolean; emailEnabled: boolean },
  ): Promise<NotificationPreference> =>
    apiRequest(`/api/v1/notifications/preferences/${eventType}`, notificationPreferenceSchema, {
      method: 'PUT',
      body: data,
    }),
}
