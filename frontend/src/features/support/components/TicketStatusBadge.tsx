import { TICKET_STATUSES, labelOf } from '@/features/support/api'

type Props = { status: string }

const variants: Record<string, string> = {
  OPEN: 'bg-info-soft text-info',
  ASSIGNED: 'bg-accent text-accent-foreground',
  IN_PROGRESS: 'bg-warning-soft text-warning',
  WAITING_CUSTOMER: 'bg-warning-soft text-warning',
  RESOLVED: 'bg-success-soft text-success',
  CLOSED: 'bg-muted text-muted-foreground',
}

export function TicketStatusBadge({ status }: Props) {
  const className = variants[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {labelOf(TICKET_STATUSES, status)}
    </span>
  )
}
