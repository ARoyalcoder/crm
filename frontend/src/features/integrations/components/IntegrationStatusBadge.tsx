import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Integration } from '../api'

/** Whether a connected service is working: connected, failing, waiting, or not set up. */
export function IntegrationStatusBadge({ status }: { status: Integration['status'] }) {
  return <StatusBadge status={status} />
}
