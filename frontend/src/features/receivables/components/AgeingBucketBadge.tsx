import { cn } from '@/lib/utils'
import { ageingBucketLabel } from '@/features/receivables/api'

const BADGE = 'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const BUCKET_STYLES: Record<string, string> = {
  'Not due': 'border-border bg-muted/50 text-muted-foreground',
  '0–30 days': 'border-success/30 bg-success-soft text-success',
  '31–60 days': 'border-warning/30 bg-warning-soft text-warning',
  '61–90 days': 'border-warning/30 bg-warning-soft text-warning',
  'Over 90 days': 'border-destructive/30 bg-destructive-soft text-destructive',
}

/** Coloured badge showing which ageing bucket an invoice falls in. */
export function AgeingBucketBadge({ daysOverdue }: { daysOverdue: number }) {
  const label = ageingBucketLabel(daysOverdue)
  return (
    <span className={cn(BADGE, BUCKET_STYLES[label] ?? 'border-border bg-muted/50 text-muted-foreground')}>
      <span className="sr-only">Overdue: </span>
      {daysOverdue <= 0 ? 'Not due' : `${daysOverdue}d`}
    </span>
  )
}
