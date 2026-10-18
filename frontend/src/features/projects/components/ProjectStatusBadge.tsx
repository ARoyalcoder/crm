import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { projectsApi } from '../api'

/**
 * A project's state, worded the way the organisation names it (the statuses are configurable) and coloured by what it
 * means: finished, cancelled, or still moving. The list of statuses is fetched once and shared by every badge on a page.
 */
export function ProjectStatusBadge({ status }: { status: string }) {
  const statuses = useQuery(projectsApi.statusesQuery())
  const config = statuses.data?.find((candidate) => candidate.code === status)
  const meaning = config?.isCompleted ? 'COMPLETED' : config?.isCancelled ? 'CANCELLED' : status
  return <StatusBadge status={meaning} domain="project" label={config?.name} />
}

/** How urgent a project or task is: low, medium, high or critical. */
export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} domain="priority" plain />
}
