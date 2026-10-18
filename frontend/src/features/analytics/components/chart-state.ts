/**
 * What every chart card on a dashboard needs to know about the request behind it, so a card shows a skeleton
 * on first load, an error with a retry, or the previous chart dimmed while a new period loads (never a blank jump).
 */
export type ChartState = {
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  stale?: boolean
}

/** Reads the state out of a TanStack query result. */
export function chartStateOf(query: {
  isPending: boolean
  isError: boolean
  isPlaceholderData?: boolean
  isFetching?: boolean
  error: unknown
  refetch: () => unknown
}): ChartState {
  return {
    loading: query.isPending,
    error: query.isError ? query.error : undefined,
    onRetry: () => void query.refetch(),
    stale: query.isPlaceholderData === true && query.isFetching === true,
  }
}
