import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'

// Enums
export const targetTypeValues = [
  'SALES_REVENUE',
  'COLLECTION_AMOUNT',
  'PROJECT_COMPLETION',
  'FOLLOW_UP_COUNT',
  'CUSTOMER_SATISFACTION',
  'ORDER_COUNT',
  'LEAD_CONVERSION',
] as const
export type TargetType = (typeof targetTypeValues)[number]

export const targetPeriodValues = ['MONTHLY', 'QUARTERLY', 'YEARLY'] as const
export type TargetPeriod = (typeof targetPeriodValues)[number]

export const commissionStatusValues = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] as const
export type CommissionStatus = (typeof commissionStatusValues)[number]

export const commissionTypeValues = ['PERCENTAGE', 'FIXED'] as const
export type CommissionType = (typeof commissionTypeValues)[number]

// Schemas
export const performanceTargetSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  employeeId: z.string(),
  targetType: z.enum(targetTypeValues),
  period: z.enum(targetPeriodValues),
  periodYear: z.number(),
  periodMonth: z.number().nullish(),
  periodQuarter: z.number().nullish(),
  targetValue: z.number(),
  notes: z.string().nullish(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
})
export type PerformanceTarget = z.infer<typeof performanceTargetSchema>

export const performanceSummarySchema = z.object({
  targetType: z.enum(targetTypeValues),
  targetValue: z.number(),
  actual: z.number(),
  achievementPct: z.number(),
  remaining: z.number(),
  overachieved: z.boolean(),
  overachievementAmount: z.number(),
})
export type PerformanceSummary = z.infer<typeof performanceSummarySchema>

export const teamPerformanceSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  avgAchievementPct: z.number(),
  targetCount: z.number(),
})
export type TeamPerformance = z.infer<typeof teamPerformanceSchema>

export const commissionRuleSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  serviceId: z.string().nullish(),
  eligibleRoleCode: z.string().nullish(),
  commissionType: z.enum(commissionTypeValues),
  value: z.number(),
  minOrderValue: z.number().nullish(),
  active: z.boolean(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
})
export type CommissionRule = z.infer<typeof commissionRuleSchema>

export const commissionRecordSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  employeeId: z.string(),
  ruleId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  baseAmount: z.number(),
  commissionAmount: z.number(),
  status: z.enum(commissionStatusValues),
  periodMonth: z.number(),
  periodYear: z.number(),
  notes: z.string().nullish(),
  approvedBy: z.string().nullish(),
  approvedAt: z.string().nullish(),
  paidAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CommissionRecord = z.infer<typeof commissionRecordSchema>

export const commissionSummarySchema = z.object({
  pendingTotal: z.number(),
  approvedTotal: z.number(),
  paidTotal: z.number(),
  cancelledTotal: z.number(),
})
export type CommissionSummaryData = z.infer<typeof commissionSummarySchema>

// Label helpers
export const targetTypeLabels: Record<TargetType, string> = {
  SALES_REVENUE: 'Sales revenue',
  COLLECTION_AMOUNT: 'Collection amount',
  PROJECT_COMPLETION: 'Project completion',
  FOLLOW_UP_COUNT: 'Follow-up count',
  CUSTOMER_SATISFACTION: 'Customer satisfaction',
  ORDER_COUNT: 'Order count',
  LEAD_CONVERSION: 'Lead conversion',
}

// Query / Mutation helpers
export const performanceApi = {
  // Targets
  targetsQuery: (employeeId: string, year: number, period?: TargetPeriod) =>
    queryOptions({
      queryKey: ['employees', employeeId, 'targets', year, period],
      queryFn: () => {
        const qs = period ? `?year=${year}&period=${period}` : `?year=${year}`
        return apiRequest(`/api/v1/employees/${employeeId}/targets${qs}`, z.array(performanceTargetSchema))
      },
      enabled: Boolean(employeeId),
    }),

  summaryQuery: (employeeId: string, year: number, month: number) =>
    queryOptions({
      queryKey: ['employees', employeeId, 'performance-summary', year, month],
      queryFn: () =>
        apiRequest(
          `/api/v1/employees/${employeeId}/performance-summary?year=${year}&month=${month}`,
          z.array(performanceSummarySchema),
        ),
      enabled: Boolean(employeeId),
    }),

  teamPerformanceQuery: (managerId: string, year: number, month: number) =>
    queryOptions({
      queryKey: ['performance', 'team', managerId, year, month],
      queryFn: () =>
        apiRequest(
          `/api/v1/performance/team?managerId=${managerId}&year=${year}&month=${month}`,
          z.array(teamPerformanceSchema),
        ),
      enabled: Boolean(managerId),
    }),

  setTarget: async (
    employeeId: string,
    data: {
      targetType: TargetType
      period: TargetPeriod
      periodYear: number
      periodMonth?: number
      periodQuarter?: number
      targetValue: number
      notes?: string
    },
  ) =>
    apiRequest(`/api/v1/employees/${employeeId}/targets`, performanceTargetSchema, {
      method: 'PUT',
      body: data,
    }),

  // Commission Rules
  rulesQuery: (active?: boolean) =>
    queryOptions({
      queryKey: ['commission-rules', active],
      queryFn: () => {
        const qs = active !== undefined ? `?active=${active}` : ''
        return apiRequest(`/api/v1/commission-rules${qs}`, z.array(commissionRuleSchema))
      },
    }),

  ruleDetailQuery: (id: string) =>
    queryOptions({
      queryKey: ['commission-rules', id],
      queryFn: () => apiRequest(`/api/v1/commission-rules/${id}`, commissionRuleSchema),
      enabled: Boolean(id),
    }),

  createRule: async (data: {
    name: string
    serviceId?: string
    eligibleRoleCode?: string
    commissionType: CommissionType
    value: number
    minOrderValue?: number
    active: boolean
  }) =>
    apiRequest('/api/v1/commission-rules', commissionRuleSchema, { method: 'POST', body: data }),

  updateRule: async (
    id: string,
    data: {
      name: string
      serviceId?: string
      eligibleRoleCode?: string
      commissionType: CommissionType
      value: number
      minOrderValue?: number
      active: boolean
    },
  ) =>
    apiRequest(`/api/v1/commission-rules/${id}`, commissionRuleSchema, { method: 'PUT', body: data }),

  deleteRule: async (id: string) =>
    apiRequest(`/api/v1/commission-rules/${id}`, z.undefined(), { method: 'DELETE' }),

  // Commission Records
  recordsQuery: (employeeId: string, year: number, month: number, status?: CommissionStatus) =>
    queryOptions({
      queryKey: ['employees', employeeId, 'commissions', year, month, status],
      queryFn: () => {
        let qs = `?year=${year}&month=${month}`
        if (status) qs += `&status=${status}`
        return apiRequest(`/api/v1/employees/${employeeId}/commissions${qs}`, z.array(commissionRecordSchema))
      },
      enabled: Boolean(employeeId),
    }),

  employeeSummaryQuery: (employeeId: string, year: number, month: number) =>
    queryOptions({
      queryKey: ['employees', employeeId, 'commissions', 'summary', year, month],
      queryFn: () =>
        apiRequest(
          `/api/v1/employees/${employeeId}/commissions/summary?year=${year}&month=${month}`,
          commissionSummarySchema,
        ),
      enabled: Boolean(employeeId),
    }),

  orgSummaryQuery: (year: number, month: number) =>
    queryOptions({
      queryKey: ['commissions', 'summary', year, month],
      queryFn: () =>
        apiRequest(`/api/v1/commissions/summary?year=${year}&month=${month}`, commissionSummarySchema),
    }),

  allRecordsQuery: (page = 0, size = 20) =>
    queryOptions({
      queryKey: ['commissions', 'all', page, size],
      queryFn: () =>
        apiRequest(
          `/api/v1/commissions?page=${page}&size=${size}`,
          z.object({
            content: z.array(commissionRecordSchema),
            totalElements: z.number(),
            totalPages: z.number(),
            number: z.number(),
          }),
        ),
    }),

  approveRecord: async (id: string) =>
    apiRequest(`/api/v1/commissions/${id}/approve`, commissionRecordSchema, { method: 'PUT' }),

  markPaidRecord: async (id: string) =>
    apiRequest(`/api/v1/commissions/${id}/paid`, commissionRecordSchema, { method: 'PUT' }),

  cancelRecord: async (id: string) =>
    apiRequest(`/api/v1/commissions/${id}/cancel`, commissionRecordSchema, { method: 'PUT' }),
}
