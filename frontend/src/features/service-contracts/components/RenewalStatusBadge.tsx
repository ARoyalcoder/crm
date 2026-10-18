import { StatusBadge } from '@/components/shared/StatusBadge'
import type { RenewalStatus } from '../api'

/** Where a contract stands on its renewal: not due yet, due soon, overdue, renewed or lapsed. */
export function RenewalStatusBadge({ status }: { status: RenewalStatus }) {
  return <StatusBadge status={status} domain="renewal" />
}
