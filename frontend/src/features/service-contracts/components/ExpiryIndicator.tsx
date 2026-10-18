import { toneText, type Tone } from '@/components/shared/tones'
import { daysUntil } from '@/lib/format'
import { cn } from '@/lib/utils'

type ExpiryIndicatorProps = {
  /** The last day the contract or warranty is in force, as `YYYY-MM-DD`. */
  endDate: string
  className?: string
}

const plural = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`

/** How long is left, in words: "Ended 3 days ago", "Ends today", "12 days left". Warmer as the date gets close. */
export function ExpiryIndicator({ endDate, className }: ExpiryIndicatorProps) {
  const days = daysUntil(endDate)

  let label: string
  let tone: Tone
  if (days < 0) {
    label = `Ended ${plural(-days)} ago`
    tone = 'neutral'
  } else if (days === 0) {
    label = 'Ends today'
    tone = 'danger'
  } else {
    label = `${plural(days)} left`
    tone = days < 15 ? 'danger' : days < 30 ? 'warning' : 'success'
  }

  return <span className={cn('text-xs font-medium', toneText[tone], className)}>{label}</span>
}
