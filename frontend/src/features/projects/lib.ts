import type { ProjectStatusConfig } from './api'

export const PROJECT_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const

/**
 * Has the project reached an end state (finished or cancelled)? Follows the organization's own status flags, with the
 * built-in COMPLETED and CANCELLED codes as the fallback while the statuses are still loading.
 */
export function isClosedProject(status: string, statuses: ProjectStatusConfig[] | undefined): boolean {
  const config = statuses?.find((candidate) => candidate.code === status)
  return config ? config.isCompleted || config.isCancelled : status === 'COMPLETED' || status === 'CANCELLED'
}
