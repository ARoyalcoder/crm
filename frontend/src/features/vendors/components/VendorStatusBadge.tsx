import { StatusBadge } from '@/components/shared/StatusBadge'

/** Whether a supplier can be used: active, inactive, blocked or under review. */
export function VendorStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />
}
