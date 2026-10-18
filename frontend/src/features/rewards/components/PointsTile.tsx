import { tierLabel } from '@/features/rewards/api'

interface PointsTileProps {
  totalPoints: number
  tier: string
}

const tierConfig: Record<string, { color: string; bg: string }> = {
  STANDARD: { color: 'text-muted-foreground ', bg: 'bg-muted ' },
  SILVER: { color: 'text-muted-foreground ', bg: 'bg-muted ' },
  GOLD: { color: 'text-warning ', bg: 'bg-warning-soft ' },
  PLATINUM: { color: 'text-info ', bg: 'bg-info-soft ' },
}

/** Hero tile showing total loyalty points and customer tier. */
export function PointsTile({ totalPoints, tier }: PointsTileProps) {
  const { color, bg } = tierConfig[tier] ?? tierConfig.STANDARD

  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-6 ${bg}`}>
      <span className={`text-5xl font-bold tabular-nums ${color}`}>
        {totalPoints.toLocaleString()}
      </span>
      <span className="text-sm font-medium text-muted-foreground">points</span>
      <span className={`mt-1 rounded-full px-3 py-0.5 text-xs font-semibold ${color} border`}>
        {tierLabel(tier)} tier
      </span>
    </div>
  )
}
