import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// ------------------------------------------------------------------ keys

export const rewardKeys = {
  all: ['rewards'] as const,
  achievementRules: (active?: boolean) => [...rewardKeys.all, 'achievement-rules', active] as const,
  achievementRule: (id: string) => [...rewardKeys.all, 'achievement-rule', id] as const,
  userAchievements: (userId: string) => [...rewardKeys.all, 'user-achievements', userId] as const,
  leaderboard: () => [...rewardKeys.all, 'leaderboard'] as const,
  customerReward: (customerId: string) => [...rewardKeys.all, 'customer-reward', customerId] as const,
  customerHistory: (customerId: string) => [...rewardKeys.all, 'customer-history', customerId] as const,
}

export function refreshRewards(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: rewardKeys.all })
}

// ------------------------------------------------------------------ constants

export const ACHIEVEMENT_CATEGORIES = [
  { value: 'FIRST_MILESTONE', label: 'First milestone' },
  { value: 'COUNT_MILESTONE', label: 'Count milestone' },
  { value: 'TARGET_ACHIEVEMENT', label: 'Target achievement' },
  { value: 'PERSONAL_BEST', label: 'Personal best' },
  { value: 'CUSTOMER_FEEDBACK', label: 'Customer feedback' },
  { value: 'RENEWAL', label: 'Renewal' },
  { value: 'COMPLETION', label: 'Completion' },
] as const

export const BADGE_LEVELS = [
  { value: 'BRONZE', label: 'Bronze' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'PLATINUM', label: 'Platinum' },
] as const

export const REWARD_TRANSACTION_TYPES = [
  { value: 'EARNED', label: 'Earned' },
  { value: 'REDEEMED', label: 'Redeemed' },
  { value: 'ADJUSTED', label: 'Adjusted' },
  { value: 'EXPIRED', label: 'Expired' },
] as const

export const CUSTOMER_TIERS = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'PLATINUM', label: 'Platinum' },
] as const

// ------------------------------------------------------------------ schemas

export const achievementRuleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  category: z.string(),
  triggerEventType: z.string(),
  triggerThreshold: z.number().nullish(),
  employeePoints: z.number(),
  badgeLevel: z.string().nullish(),
  active: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
})
export type AchievementRule = z.infer<typeof achievementRuleSchema>

export const userAchievementSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  ruleId: z.string(),
  earnedAt: z.string(),
  context: z.string().nullish(),
})
export type UserAchievement = z.infer<typeof userAchievementSchema>

export const leaderboardEntrySchema = z.object({
  userId: z.string(),
  totalPoints: z.number(),
  achievementCount: z.number(),
})
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>

export const customerRewardSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string(),
  totalPoints: z.number(),
  tier: z.string(),
  lastActivityAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CustomerReward = z.infer<typeof customerRewardSchema>

export const rewardTransactionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string(),
  transactionType: z.string(),
  points: z.number(),
  reason: z.string(),
  referenceType: z.string().nullish(),
  referenceId: z.string().nullish(),
  createdAt: z.string(),
})
export type RewardTransaction = z.infer<typeof rewardTransactionSchema>

// ------------------------------------------------------------------ query options

export function achievementRulesQuery(active?: boolean) {
  return queryOptions({
    queryKey: rewardKeys.achievementRules(active),
    queryFn: ({ signal }) => {
      const params = active !== undefined ? `?active=${String(active)}` : ''
      return apiRequest(`/achievement-rules${params}`, z.array(achievementRuleSchema), { signal })
    },
  })
}

export function achievementRuleQuery(id: string) {
  return queryOptions({
    queryKey: rewardKeys.achievementRule(id),
    queryFn: ({ signal }) =>
      apiRequest(`/achievement-rules/${id}`, achievementRuleSchema, { signal }),
  })
}

export function userAchievementsQuery(userId: string) {
  return queryOptions({
    queryKey: rewardKeys.userAchievements(userId),
    queryFn: ({ signal }) =>
      apiRequest(`/users/${userId}/achievements`, z.array(userAchievementSchema), { signal }),
  })
}

export function leaderboardQuery() {
  return queryOptions({
    queryKey: rewardKeys.leaderboard(),
    queryFn: ({ signal }) =>
      apiRequest('/achievements/leaderboard', z.array(leaderboardEntrySchema), { signal }),
  })
}

export function customerRewardQuery(customerId: string) {
  return queryOptions({
    queryKey: rewardKeys.customerReward(customerId),
    queryFn: ({ signal }) =>
      apiRequest(`/customers/${customerId}/rewards`, customerRewardSchema, { signal }),
  })
}

export function customerRewardHistoryQuery(customerId: string) {
  return queryOptions({
    queryKey: rewardKeys.customerHistory(customerId),
    queryFn: ({ signal }) =>
      apiRequest(
        `/customers/${customerId}/rewards/history`,
        z.array(rewardTransactionSchema),
        { signal },
      ),
  })
}

// ------------------------------------------------------------------ mutations

export type SaveAchievementRuleInput = {
  name: string
  description?: string | null
  category: string
  triggerEventType: string
  triggerThreshold?: number | null
  employeePoints: number
  badgeLevel?: string | null
}

export function createAchievementRule(input: SaveAchievementRuleInput) {
  return apiRequest('/achievement-rules', achievementRuleSchema, { method: 'POST', body: input })
}

export function updateAchievementRule(id: string, input: SaveAchievementRuleInput) {
  return apiRequest(`/achievement-rules/${id}`, achievementRuleSchema, {
    method: 'PUT',
    body: input,
  })
}

export function deleteAchievementRule(id: string) {
  return apiRequest(`/achievement-rules/${id}`, z.undefined(), { method: 'DELETE' })
}

export function toggleAchievementRule(id: string) {
  return apiRequest(`/achievement-rules/${id}/toggle`, achievementRuleSchema, { method: 'PUT' })
}

export function addCustomerPoints(
  customerId: string,
  body: { points: number; reason: string; referenceType?: string; referenceId?: string },
) {
  return apiRequest(`/customers/${customerId}/rewards/add-points`, customerRewardSchema, {
    method: 'POST',
    body,
  })
}

export function redeemCustomerPoints(
  customerId: string,
  body: { points: number; reason: string },
) {
  return apiRequest(`/customers/${customerId}/rewards/redeem`, customerRewardSchema, {
    method: 'POST',
    body,
  })
}

// ------------------------------------------------------------------ label helpers

export function categoryLabel(value: string) {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function badgeLevelLabel(value: string) {
  return BADGE_LEVELS.find((b) => b.value === value)?.label ?? value
}

export function transactionTypeLabel(value: string) {
  return REWARD_TRANSACTION_TYPES.find((t) => t.value === value)?.label ?? value
}

export function tierLabel(value: string) {
  return CUSTOMER_TIERS.find((t) => t.value === value)?.label ?? value
}
