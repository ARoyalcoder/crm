import { cn } from '@/lib/utils'

type Props = {
  pct: number
  /** Show only the badge without surrounding text. */
  compact?: boolean
}

/**
 * Displays an achievement percentage with a semantic colour:
 *  - Green  (≥ 100 %): target met or exceeded
 *  - Amber  (70–99 %): approaching target
 *  - Red    (< 70 %):  significantly behind
 */
export function AchievementBadge({ pct, compact = false }: Props) {
  const tier =
    pct >= 100 ? 'green'
    : pct >= 70 ? 'amber'
    : 'red'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        tier === 'green' && 'bg-success-soft text-success',
        tier === 'amber' && 'bg-warning-soft text-warning',
        tier === 'red'&& 'bg-destructive-soft text-destructive',
      )}
    >
      {pct.toFixed(1)}%{!compact && (pct >= 100 ? ' ✓' : '')}
    </span>
  )
}
