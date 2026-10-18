import { StatusBadge } from '@/components/shared/StatusBadge'
import type { QuotationStatus } from '../api'

/** Where a quotation stands: draft, awaiting approval, sent, accepted and so on. */
export function QuotationStatusBadge({ status, className }: { status: QuotationStatus; className?: string }) {
  return <StatusBadge status={status} className={className} />
}
