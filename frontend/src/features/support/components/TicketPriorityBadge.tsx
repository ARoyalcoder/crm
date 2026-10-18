import { TICKET_PRIORITIES, labelOf } from '@/features/support/api'

type Props = { priority: string }

const variants: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-info-soft text-info',
  HIGH: 'bg-warning-soft text-warning',
  CRITICAL: 'bg-destructive-soft text-destructive',
}

export function TicketPriorityBadge({ priority }: Props) {
  const className = variants[priority] ?? 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {labelOf(TICKET_PRIORITIES, priority)}
    </span>
  )
}
