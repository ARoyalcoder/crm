import { StatusBadge } from '@/components/shared/StatusBadge'
import type { AmcStatus } from '../api'

/** The state of a maintenance contract, worded and coloured like every other status in the product. */
export function AmcStatusBadge({ status }: { status: AmcStatus }) {
  return <StatusBadge status={status} />
}
