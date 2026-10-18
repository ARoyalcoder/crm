import { cn } from '@/lib/utils'
import type { CommissionStatus } from '../api'

const config: Record<CommissionStatus, { label: string; className: string }> = {
  PENDING:   { label: 'Pending',   className: 'bg-warning-soft text-warning' },
  APPROVED:  { label: 'Approved',  className: 'bg-info-soft text-info'},
  PAID:      { label: 'Paid',      className: 'bg-success-soft text-success'},
  CANCELLED: { label: 'Cancelled', className: 'bg-muted text-muted-foreground'},
}

type Props = { status: CommissionStatus }

export function CommissionStatusBadge({ status }: Props) {
  const { label, className } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {label}
    </span>
  )
}
