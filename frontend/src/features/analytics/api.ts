import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import type { DateRange } from '@/lib/date-range'

/**
 * The dashboards' API. Every shape mirrors what the server sends (`AnalyticsModels` on the backend).
 * Three rules hold throughout, so the pages never have to guess:
 *   - money and counts are plain numbers in the organization's currency;
 *   - a figure that cannot be worked out (nothing to divide by) is `null`, which a page shows as "—", never as 0;
 *   - a whole block is `null` when the signed-in person's permissions do not cover it, and the page leaves it out.
 */

const day = z.string() // YYYY-MM-DD
const amount = z.number()
const count = z.number()
const pct = z.number().nullable()

// ────────────────────────────────────────────────────────── shared

export const periodSchema = z.object({
  from: day,
  to: day,
  days: count,
  previousFrom: day,
  previousTo: day,
  asOf: day,
  granularity: z.enum(['DAY', 'WEEK', 'MONTH']),
  currency: z.string(),
})
export type Period = z.infer<typeof periodSchema>

const comparedSchema = z.object({ value: amount, previous: amount })
const countComparedSchema = z.object({ value: count, previous: count })
export type Compared = z.infer<typeof comparedSchema>
export type CountCompared = z.infer<typeof countComparedSchema>

// ────────────────────────────────────────────────────────── finance

const openSchema = z.object({ amount, invoices: count })
const trendPointSchema = z.object({ bucket: day, invoiced: amount, collected: amount })
const ageingBandSchema = z.object({ key: z.string(), label: z.string(), amount, invoices: count })
const verticalShareSchema = z.object({ code: z.string().nullable(), name: z.string(), amount })
const verticalMarginSchema = z.object({
  code: z.string().nullable(),
  name: z.string(),
  projects: count,
  revenue: amount,
  recordedCost: amount,
  marginPct: pct,
})

export const projectEconomicsSchema = z.object({
  projects: count,
  revenue: amount,
  recordedCost: amount,
  margin: amount,
  marginPct: pct,
  material: amount,
  labour: amount,
  vendor: amount,
  travel: amount,
  other: amount,
  notItemised: amount,
  byVertical: z.array(verticalMarginSchema),
})
export type ProjectEconomics = z.infer<typeof projectEconomicsSchema>

export const financeOverviewSchema = z.object({
  invoiced: comparedSchema,
  collected: comparedSchema,
  outstanding: openSchema,
  overdue: openSchema,
  collectionRatePct: pct,
  trend: z.array(trendPointSchema),
  ageing: z.array(ageingBandSchema),
  byVertical: z.array(verticalShareSchema),
})
export type FinanceOverview = z.infer<typeof financeOverviewSchema>

const debtorSchema = z.object({
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  outstanding: amount,
  overdue: amount,
  invoices: count,
  oldestDaysOverdue: z.number().nullable(),
})
const methodShareSchema = z.object({ method: z.string().nullable(), amount, payments: count })

const financeDashboardSchema = z.object({
  period: periodSchema,
  overview: financeOverviewSchema,
  dsoDays: pct,
  topDebtors: z.array(debtorSchema),
  collectedByMethod: z.array(methodShareSchema),
  projectEconomics: projectEconomicsSchema,
})
export type FinanceDashboard = z.infer<typeof financeDashboardSchema>

// ────────────────────────────────────────────────────────── sales

const funnelStageSchema = z.object({ key: z.string(), label: z.string(), count })
const stageValueSchema = z.object({ stage: z.string(), order: count, opportunities: count, amount })

export const salesOverviewSchema = z.object({
  pipeline: z.object({ amount, deals: count }).nullable(),
  weightedPipeline: z.number().nullable(),
  won: comparedSchema.nullable(),
  wonCount: countComparedSchema.nullable(),
  leadsCreated: countComparedSchema.nullable(),
  leadWinRatePct: pct,
  leadsLost: z.number().nullable(),
  leadFunnel: z.array(funnelStageSchema).nullable(),
  pipelineByStage: z.array(stageValueSchema).nullable(),
})
export type SalesOverview = z.infer<typeof salesOverviewSchema>

const quotationSummarySchema = z.object({ created: count, pendingApproval: count, accepted: count, acceptedValue: amount, open: count })
const salesPersonSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().nullable(),
  orders: count,
  orderValue: amount,
  wonDeals: count,
})
const ordersSummarySchema = z.object({
  count,
  value: amount,
  averageValue: z.number().nullable(),
  topSalespeople: z.array(salesPersonSchema),
  trend: z.array(z.object({ bucket: day, orders: count, value: amount })),
})

const salesDashboardSchema = z.object({
  period: periodSchema,
  overview: salesOverviewSchema,
  wonByVertical: z.array(verticalShareSchema).nullable(),
  quotations: quotationSummarySchema.nullable(),
  orders: ordersSummarySchema.nullable(),
})
export type SalesDashboard = z.infer<typeof salesDashboardSchema>

// ────────────────────────────────────────────────────────── projects

const statusCountSchema = z.object({ code: z.string(), name: z.string(), order: count, terminal: z.boolean(), count })
const delayedProjectSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  customer: z.string().nullable(),
  manager: z.string().nullable(),
  daysLate: count,
  progressPct: count,
})

export const projectsOverviewSchema = z.object({
  active: count,
  delayed: count,
  completed: countComparedSchema,
  onTimePct: pct,
  avgDurationDays: z.number().nullable(),
  byStatus: z.array(statusCountSchema),
  delayedProjects: z.array(delayedProjectSchema),
})
export type ProjectsOverview = z.infer<typeof projectsOverviewSchema>

const costRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  expectedCost: amount,
  recordedCost: amount,
  progressPct: count,
})
const milestoneSchema = z.object({
  projectId: z.string(),
  projectTitle: z.string(),
  milestone: z.string(),
  dueDate: day,
  status: z.string(),
  daysFromToday: z.number(),
})
export type MilestoneRow = z.infer<typeof milestoneSchema>

const deliveryRowSchema = z.object({ bucket: day, onTime: count, late: count })
export type DeliveryRow = z.infer<typeof deliveryRowSchema>

const projectsDashboardSchema = z.object({
  period: periodSchema,
  overview: projectsOverviewSchema,
  expectedCostTotal: amount,
  recordedCostTotal: amount,
  costComparison: z.array(costRowSchema),
  deliveryTrend: z.array(deliveryRowSchema),
  upcomingMilestones: z.array(milestoneSchema),
  economics: projectEconomicsSchema.nullable(),
})
export type ProjectsDashboard = z.infer<typeof projectsDashboardSchema>

// ────────────────────────────────────────────────────────── service

const amcRenewalSchema = z.object({
  id: z.string(),
  number: z.string(),
  customer: z.string().nullable(),
  endDate: day,
  value: amount,
  daysLeft: z.number(),
  renewalStatus: z.string().nullable(),
})
export type AmcRenewal = z.infer<typeof amcRenewalSchema>
const amcSummarySchema = z.object({
  active: count,
  expiring30: count,
  expiring90: count,
  expiring90Value: amount,
  lapsedInPeriod: count,
  renewedInPeriod: count,
  upcoming: z.array(amcRenewalSchema),
})

export const serviceOverviewSchema = z.object({
  openTickets: z.number().nullable(),
  breachedOpen: z.number().nullable(),
  opened: countComparedSchema.nullable(),
  resolved: countComparedSchema.nullable(),
  avgResolutionHours: z.number().nullable(),
  slaCompliancePct: pct,
  volume: z.array(z.object({ bucket: day, opened: count, resolved: count })).nullable(),
  amc: amcSummarySchema.nullable(),
})
export type ServiceOverview = z.infer<typeof serviceOverviewSchema>

const serviceDashboardSchema = z.object({
  period: periodSchema,
  overview: serviceOverviewSchema,
  openByPriority: z.array(z.object({ priority: z.string(), open: count, breached: count })).nullable(),
  agentLoad: z.array(z.object({ userId: z.string().nullable(), name: z.string(), open: count, breached: count })).nullable(),
  warrantiesExpiring90: z.number().nullable(),
})
export type ServiceDashboard = z.infer<typeof serviceDashboardSchema>

// ────────────────────────────────────────────────────────── workforce

const workforceDashboardSchema = z.object({
  period: periodSchema,
  totalEmployees: count,
  byDepartment: z.array(z.object({ department: z.string().nullable(), employees: count })),
  avgAttendanceRate: pct,
  attendanceTrend: z.array(z.object({ bucket: day, ratePct: pct, records: count })),
  presentToday: count,
  onLeaveToday: count,
  absentToday: count,
  topPerformers: z.array(z.object({ userId: z.string().nullable(), name: z.string().nullable(), commissionAmount: amount })).nullable(),
})
export type WorkforceDashboard = z.infer<typeof workforceDashboardSchema>

// ────────────────────────────────────────────────────────── control tower

const controlTowerSchema = z.object({
  period: periodSchema,
  finance: financeOverviewSchema.nullable(),
  sales: salesOverviewSchema.nullable(),
  projects: projectsOverviewSchema.nullable(),
  service: serviceOverviewSchema.nullable(),
})
export type ControlTower = z.infer<typeof controlTowerSchema>

// ────────────────────────────────────────────────────────── my work

const taskRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string().nullable(),
  priority: z.string().nullable(),
  status: z.string(),
  dueAt: z.string().nullable(),
  overdue: z.boolean(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  entityName: z.string().nullable(),
})
const projectTaskRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  projectId: z.string(),
  projectTitle: z.string(),
  dueDate: day.nullable(),
  status: z.string(),
  priority: z.string().nullable(),
  overdue: z.boolean(),
})
const assignedProjectSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  customer: z.string().nullable(),
  status: z.string(),
  progressPct: count,
  expectedCompletion: day.nullable(),
  daysLeft: z.number(),
  role: z.string().nullable(),
})
const jobRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  customer: z.string().nullable(),
  scheduledStart: z.string().nullable(),
  status: z.string(),
})
const ticketRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  subject: z.string(),
  customer: z.string().nullable(),
  priority: z.string(),
  status: z.string(),
  dueAt: z.string().nullable(),
  breached: z.boolean(),
})
const collectionRowSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  customer: z.string().nullable(),
  outstanding: amount,
  dueDate: day.nullable(),
  priority: z.string().nullable(),
  status: z.string(),
})
const targetProgressSchema = z.object({
  type: z.string(),
  label: z.string(),
  target: amount,
  actual: z.number().nullable(),
  achievementPct: pct,
  tracked: z.boolean(),
})

const myWorkSchema = z.object({
  userId: z.string(),
  name: z.string().nullable(),
  asOf: day,
  tasks: z.object({ dueToday: count, overdue: count, upcoming7Days: count, completedThisWeek: count, items: z.array(taskRowSchema) }).nullable(),
  projectTasks: z.object({ open: count, overdue: count, items: z.array(projectTaskRowSchema) }).nullable(),
  projects: z.array(assignedProjectSchema).nullable(),
  jobs: z.object({ today: count, upcoming: count, items: z.array(jobRowSchema) }).nullable(),
  tickets: z.object({ open: count, breached: count, items: z.array(ticketRowSchema) }).nullable(),
  collections: z.object({ open: count, overdue: count, items: z.array(collectionRowSchema) }).nullable(),
  targets: z.object({ year: count, month: count, items: z.array(targetProgressSchema) }).nullable(),
})
export type MyWork = z.infer<typeof myWorkSchema>
export type TaskRow = z.infer<typeof taskRowSchema>

// ────────────────────────────────────────────────────────── queries

const rangeQuery = (range: DateRange) => `from=${range.from}&to=${range.to}`

// Dashboards keep the previous response on screen while a new range loads (the chart dims instead of blanking).
const DASHBOARD_STALE_MS = 60_000

export function controlTowerQuery(range: DateRange) {
  return queryOptions({
    queryKey: ['analytics', 'control-tower', range],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/control-tower?${rangeQuery(range)}`, controlTowerSchema, { signal }),
  })
}

export function financeDashboardQuery(range: DateRange) {
  return queryOptions({
    queryKey: ['analytics', 'finance', range],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/finance?${rangeQuery(range)}`, financeDashboardSchema, { signal }),
  })
}

export function salesDashboardQuery(range: DateRange) {
  return queryOptions({
    queryKey: ['analytics', 'sales', range],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/sales?${rangeQuery(range)}`, salesDashboardSchema, { signal }),
  })
}

export function projectsDashboardQuery(range: DateRange) {
  return queryOptions({
    queryKey: ['analytics', 'projects', range],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/projects?${rangeQuery(range)}`, projectsDashboardSchema, { signal }),
  })
}

export function serviceDashboardQuery(range: DateRange) {
  return queryOptions({
    queryKey: ['analytics', 'service', range],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/service?${rangeQuery(range)}`, serviceDashboardSchema, { signal }),
  })
}

export function workforceDashboardQuery(range: DateRange, department?: string) {
  const extra = department ? `&department=${encodeURIComponent(department)}` : ''
  return queryOptions({
    queryKey: ['analytics', 'workforce', range, department ?? null],
    staleTime: DASHBOARD_STALE_MS,
    queryFn: ({ signal }) => apiRequest(`/analytics/workforce?${rangeQuery(range)}${extra}`, workforceDashboardSchema, { signal }),
  })
}

export const myWorkQuery = queryOptions({
  queryKey: ['analytics', 'my-work'],
  staleTime: 30_000,
  queryFn: ({ signal }) => apiRequest('/analytics/my-work', myWorkSchema, { signal }),
})
