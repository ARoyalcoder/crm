import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toneChip } from '@/components/shared/tones'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatPercent } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

type ProgressCardProps = {
  title: string
  /** 0-100. */
  percent: number
  /** Right of the title: "₹60,000 / ₹1,00,000". */
  detail?: ReactNode
  /** Under the bar: a deadline, a status, who it is for. */
  footer?: ReactNode
  icon?: LucideIcon
  /** Colours the bar. Defaults to a tone derived from the percentage (low is a warning only when `warnBelow` is set). */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  href?: string
  className?: string
}

const iconTone: Record<NonNullable<ProgressCardProps['tone']>, Tone> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

/** A goal, target or project with a meter: what it is, how far along, and what is left to say about it. */
export function ProgressCard({ title, percent, detail, footer, icon: Icon, tone = 'primary', href, className }: ProgressCardProps) {
  const heading = href ? (
    <Link to={href} className="truncate font-medium hover:underline">
      {title}
    </Link>
  ) : (
    <p className="truncate font-medium">{title}</p>
  )
  return (
    <Card className={cn('gap-3 p-3', className)}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneChip[iconTone[tone]])}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {heading}
            <span className="shrink-0 font-semibold tabular">{formatPercent(percent, 0)}</span>
          </div>
          {detail ? <p className="text-xs text-muted-foreground tabular">{detail}</p> : null}
        </div>
      </div>
      <Progress value={percent} label={title} tone={tone} />
      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
    </Card>
  )
}
