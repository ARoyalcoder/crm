import { BadgeLevelBadge } from './BadgeLevelBadge'
import type { UserAchievement } from '@/features/rewards/api'

interface AchievementCardProps {
  achievement: UserAchievement
  /** Optional rule name to display (pass when the rule list is available). */
  ruleName?: string
  /** Optional badge level to display. */
  badgeLevel?: string | null
}

/** Card showing an individual achievement: rule name, badge level, and earned date. */
export function AchievementCard({ achievement, ruleName, badgeLevel }: AchievementCardProps) {
  const formattedDate = new Date(achievement.earnedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">
          {ruleName ?? achievement.ruleId}
        </p>
        {badgeLevel && <BadgeLevelBadge level={badgeLevel} />}
      </div>
      <p className="text-xs text-muted-foreground">Earned {formattedDate}</p>
      {achievement.context ? (
        <p className="truncate text-xs text-muted-foreground">{achievement.context}</p>
      ) : null}
    </div>
  )
}
