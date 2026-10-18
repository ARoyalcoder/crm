import { useState } from 'react'
import { Clock } from 'lucide-react'

type Props = {
  dueAt: string | null | undefined
  slaBreachStatus: string
  resolvedAt?: string | null
}

function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const statusStyles: Record<string, string> = {
  ON_TRACK: 'text-success ',
  AT_RISK: 'text-warning ',
  BREACHED: 'text-destructive ',
  NOT_APPLICABLE: 'text-muted-foreground',
}

/** Shows the SLA countdown or breach duration next to a clock icon. */
export function SlaTimer({ dueAt, slaBreachStatus, resolvedAt }: Props) {
  const [now] = useState(() => Date.now())
  if (slaBreachStatus === 'NOT_APPLICABLE' || !dueAt) {
    return <span className="text-xs text-muted-foreground">No SLA</span>
  }

  const dueMs = new Date(dueAt).getTime()
  const compareMs = resolvedAt ? new Date(resolvedAt).getTime() : now
  const diffMs = dueMs - compareMs
  const overdue = diffMs < 0

  const colorClass = statusStyles[slaBreachStatus] ?? 'text-muted-foreground'

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Clock className="size-3" aria-hidden="true" />
      {overdue ? `Overdue by ${formatDuration(diffMs)}` : `${formatDuration(diffMs)} left`}
    </span>
  )
}
