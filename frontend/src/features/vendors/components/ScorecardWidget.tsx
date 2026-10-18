import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { VENDOR_RATING_CATEGORIES, type Scorecard } from '../api'

function tone(score: number): 'success' | 'warning' | 'danger' {
  return score >= 8 ? 'success' : score >= 5 ? 'warning' : 'danger'
}

const textTone = { success: 'text-success', warning: 'text-warning', danger: 'text-destructive' } as const

type ScorecardWidgetProps = {
  scorecard: Scorecard | undefined
  isLoading?: boolean
}

/** How a vendor has been rated, by category and overall, out of 10. Categories nobody has rated say so. */
export function ScorecardWidget({ scorecard, isLoading }: ScorecardWidgetProps) {
  if (isLoading) return <SkeletonLoader variant="list" count={5} label="Loading the scorecard" />

  const scores = scorecard?.categoryScores ?? {}
  const rated = Object.keys(scores).length > 0

  return (
    <div className="grid gap-4">
      <ul className="grid gap-4">
        {VENDOR_RATING_CATEGORIES.map((category) => {
          const score = scores[category.value]
          return (
            <li key={category.value} className="grid gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{category.label}</span>
                {score !== undefined ? (
                  <span className={cn('font-semibold tabular', textTone[tone(score)])}>{score.toFixed(1)} / 10</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not rated</span>
                )}
              </div>
              <Progress value={score !== undefined ? score * 10 : 0} label={`${category.label} rating`} tone={score !== undefined ? tone(score) : 'info'} className="h-2.5" />
            </li>
          )
        })}
      </ul>
      {rated ? (
        <p className="flex items-center justify-between border-t pt-3 text-sm font-medium">
          <span>Overall average</span>
          <span className={cn('text-lg font-semibold tabular', textTone[tone(scorecard!.overallAverage)])}>{scorecard!.overallAverage.toFixed(1)} / 10</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No one has rated this vendor yet.</p>
      )}
    </div>
  )
}
