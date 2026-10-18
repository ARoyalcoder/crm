import { cn } from '@/lib/utils'

type ProgressProps = {
  /** 0-100. Values outside the range are clamped for the bar; the label still tells the truth. */
  value: number
  /** Names what is being measured, for screen readers: "Project progress". */
  label: string
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const fillTone: Record<NonNullable<ProgressProps['tone']>, string> = {
  primary: 'bg-primary',
  success: 'bg-[var(--status-good)]',
  warning: 'bg-[var(--status-warning)]',
  danger: 'bg-[var(--status-critical)]',
  info: 'bg-info',
}

const trackTone: Record<NonNullable<ProgressProps['tone']>, string> = {
  primary: 'bg-primary/15',
  success: 'bg-[var(--status-good)]/15',
  warning: 'bg-[var(--status-warning)]/20',
  danger: 'bg-[var(--status-critical)]/15',
  info: 'bg-info/15',
}

/** A horizontal meter. The track is a lighter step of the fill colour so the state reads across the whole bar. */
export function Progress({ value, label, tone = 'primary', className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('h-2 w-full overflow-hidden rounded-full', trackTone[tone], className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-300', fillTone[tone])} style={{ width: `${clamped}%` }} />
    </div>
  )
}
