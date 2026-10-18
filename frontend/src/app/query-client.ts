import { QueryClient, MutationCache } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'
import { setMutationListener } from '@/lib/api/client'

// Debounce helper to batch invalidations when multiple updates run concurrently
let invalidationTimer: ReturnType<typeof setTimeout> | null = null
export function invalidateAllQueries() {
  if (invalidationTimer) return
  invalidationTimer = setTimeout(() => {
    invalidationTimer = null
    void queryClient.invalidateQueries()
  }, 16)
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      // Whenever ANY mutation anywhere across the whole app succeeds,
      // invalidate all queries so all pages, modals, tables, and dashboards immediately reflect the update!
      invalidateAllQueries()
    },
  }),
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 seconds (short enough to be instantaneous, long enough to avoid rapid duplicate requests)
      staleTime: 1000 * 2,
      // Retain unused data in memory cache for 20 minutes for instantaneous re-renders
      gcTime: 1000 * 60 * 20,
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
      // A 4xx will not fix itself; only retry network failures and server errors.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

// Wire direct apiRequest writes (POST/PUT/PATCH/DELETE) to global query invalidation
setMutationListener(() => {
  invalidateAllQueries()
})

