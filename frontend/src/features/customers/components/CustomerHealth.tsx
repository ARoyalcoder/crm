import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { CustomerOverview, HealthSignal } from '@/features/customers/api'
import { cn } from '@/lib/utils'

/** Must match the backend enum CustomerOverviewService.HealthLevel. */
const LEVELS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  GOOD: { label: 'Healthy', icon: CircleCheck, tone: 'border-success/30 bg-success-soft text-success' },
  NEEDS_ATTENTION: { label: 'Needs attention', icon: TriangleAlert, tone: 'border-warning/30 bg-warning-soft text-warning' },
  AT_RISK: { label: 'At risk', icon: CircleAlert, tone: 'border-destructive/30 bg-destructive-soft text-destructive' },
  UNKNOWN: { label: 'Not enough history', icon: CircleHelp, tone: 'bg-muted text-muted-foreground' },
}

const IMPACTS: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  POSITIVE: { icon: CircleCheck, tone: 'text-success', label: 'Good sign' },
  WARNING: { icon: TriangleAlert, tone: 'text-warning', label: 'Needs attention' },
  CRITICAL: { icon: CircleAlert, tone: 'text-destructive', label: 'At risk' },
}

/** The customer's health in a word, with an icon and colour that agree with it. */
export function CustomerHealthBadge({ level }: { level: string }) {
  const look = LEVELS[level] ?? LEVELS.UNKNOWN
  const Icon = look.icon
  return (
    <span
      className={cn('inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', look.tone)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Health: </span>
      {look.label}
    </span>
  )
}

/** Why the health is what it is: every signal the server found, most serious first. */
export function CustomerHealthReasons({ health }: { health: CustomerOverview['health'] }) {
  if (health.signals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough on record to judge this relationship. Log calls, meetings and visits to build the picture.
      </p>
    )
  }
  return (
    <ul className="grid gap-2" aria-label="Health reasons">
      {health.signals.map((signal) => (
        <Reason key={signal.code} signal={signal} />
      ))}
    </ul>
  )
}

function Reason({ signal }: { signal: HealthSignal }) {
  const look = IMPACTS[signal.impact] ?? IMPACTS.WARNING
  const Icon = look.icon
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn('mt-0.5 size-4 shrink-0', look.tone)} aria-hidden="true" />
      <span>
        <span className="sr-only">{look.label}: </span>
        {signal.message}
      </span>
    </li>
  )
}
