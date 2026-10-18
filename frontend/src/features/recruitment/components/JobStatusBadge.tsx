import { StatusBadge } from '@/components/shared/StatusBadge'

/** Whether a job is taking applications: draft, open, paused or closed. */
export function JobStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} domain="jobStatus" />
}
