import { queryClient } from '@/app/query-client'
import { invoicesQuery, financeSummaryQuery, paymentsQuery } from '@/features/finance/api'
import { customersQuery } from '@/features/customers/api'
import { leadsQuery } from '@/features/leads/api'
import { jobsQuery } from '@/features/field-jobs/api'
import { projectsApi } from '@/features/projects/api'
import { financeDashboardQuery } from '@/features/analytics/api'

// Route chunk loaders for instant component mounting
const routeLoaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/features/analytics/pages/HomePage'),
  '/home': () => import('@/features/analytics/pages/HomePage'),
  '/my-work': () => import('@/features/analytics/pages/MyWorkPage'),
  '/invoices': () => import('@/features/finance/pages/InvoicesPage'),
  '/payments': () => import('@/features/finance/pages/PaymentsPage'),
  '/finance/ageing': () => import('@/features/finance/pages/AgeingPage'),
  '/customers': () => import('@/features/customers/pages/CustomersPage'),
  '/leads': () => import('@/features/leads/pages/LeadsPage'),
  '/opportunities': () => import('@/features/opportunities/pages/OpportunitiesPage'),
  '/quotations': () => import('@/features/quotations/pages/QuotationsPage'),
  '/orders': () => import('@/features/orders/pages/OrdersPage'),
  '/projects': () => import('@/features/projects/pages/ProjectsPage'),
  '/field-jobs': () => import('@/features/field-jobs/pages/FieldJobsPage'),
  '/services': () => import('@/features/catalog/pages/ServicesPage'),
  '/analytics/finance': () => import('@/features/analytics/pages/FinanceDashboardPage'),
  '/analytics/projects': () => import('@/features/project-analytics/pages/ProjectAnalyticsPage'),
  '/workforce/attendance': () => import('@/features/workforce/pages/AttendancePage'),
  '/workforce/employees': () => import('@/features/workforce/pages/EmployeeListPage'),
  '/support/tickets': () => import('@/features/support/pages/TicketsPage'),
  '/admin': () => import('@/features/admin/pages/AdminHubPage'),
}

const prefetchedAt = new Map<string, number>()
const PREFETCH_TTL = 25_000 // 25s debounce to avoid repeat network overhead

/**
 * Proactively prefetches lazy route bundle chunks and warm TanStack Query data on hover/focus.
 * By the time the user clicks the link (typically 150-300ms later), data is already in memory,
 * producing an instant, zero-latency transition.
 */
export function prefetchRoute(pathname: string) {
  const cleanPath = pathname.split('?')[0] || pathname
  const now = Date.now()
  const last = prefetchedAt.get(cleanPath)

  if (last && now - last < PREFETCH_TTL) {
    return
  }
  prefetchedAt.set(cleanPath, now)

  // 1. Preload route JS bundle chunk
  const loader = routeLoaders[cleanPath]
  if (loader) {
    loader().catch(() => {
      // Chunk prefetch failure is non-fatal; regular Suspense navigation will retry
    })
  }

  // 2. Pre-warm TanStack Query cache
  try {
    switch (cleanPath) {
      case '/invoices':
        void queryClient.prefetchQuery(invoicesQuery({}))
        void queryClient.prefetchQuery(financeSummaryQuery)
        break
      case '/payments':
        void queryClient.prefetchQuery(paymentsQuery({}))
        break
      case '/customers':
        void queryClient.prefetchQuery(customersQuery({}))
        break
      case '/leads':
        void queryClient.prefetchQuery(leadsQuery({}))
        break
      case '/field-jobs':
        void queryClient.prefetchQuery(jobsQuery({}))
        break
      case '/projects':
        void queryClient.prefetchQuery(projectsApi.listQuery({}))
        break
      case '/analytics/finance':
        void queryClient.prefetchQuery(financeDashboardQuery({ from: '', to: '' }))
        break
    }
  } catch {
    // Non-critical background pre-warm
  }
}
