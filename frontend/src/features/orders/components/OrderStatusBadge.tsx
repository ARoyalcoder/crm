import { StatusBadge } from '@/components/shared/StatusBadge'
import type { OrderStatus } from '../api'

/** Where an order stands: confirmed, being worked on, partly or fully delivered, or cancelled. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <StatusBadge status={status} className={className} />
}
