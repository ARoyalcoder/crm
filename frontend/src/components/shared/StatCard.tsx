import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Sparkline } from '@/components/charts/Sparkline'
import { toneChip } from '@/components/shared/tones'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPercent } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

export type StatTrend = {
  /** Percent change against the comparison period; `null` when there is nothing to compare with (never shown as 0%). */
  change: number | null
  /** Is more good news (revenue) or bad news (overdue amount)? Decides the colour of the arrow. */
  goodWhen?: 'up' | 'down'
  /** What it is compared with, in words: "vs previous 30 days". */
  versus?: string
}

type StatCardProps = {
  label: string
  /** The headline figure, already formatted. */
  value: ReactNode
  /** One line of context under the figure. */
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  loading?: boolean
  trend?: StatTrend
  /** Twelve or so recent values, oldest first. */
  spark?: { values: number[]; label?: string }
  /** Makes the whole tile a link to the records behind the number. */
  href?: string
  className?: string
}

function TrendPill({ trend }: { trend: StatTrend }) {
  if (trend.change === null) {
    return <span className="text-[10.5px] text-muted-foreground">No earlier data</span>
  }
  const rounded = Math.round(trend.change * 10) / 10
  const flat = rounded === 0
  const up = rounded > 0
  const good = flat ? null : (trend.goodWhen ?? 'up') === (up ? 'up' : 'down')
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold',
          flat ? 'bg-muted text-muted-foreground' : good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
        )}
      >
        <Icon className="size-3 stroke-[2.5]" aria-hidden="true" />
        <span className="sr-only">{flat ? 'No change' : up ? 'Up' : 'Down'}</span>
        {formatPercent(Math.abs(rounded), 1)}
      </span>
      {trend.versus ? <span className="text-[10.5px] text-muted-foreground/80 font-medium">{trend.versus}</span> : null}
    </span>
  )
}

/**
 * One headline number: label, figure, how it moved against the comparison period, and (optionally) a
 * sparkline. With `href` the whole tile links to the records behind the number.
 */
export function StatCard({ label, value, hint, icon: Icon, tone = 'primary', loading, trend, spark, href, className }: StatCardProps) {
  const body = (
    <Card
      className={cn(
        'h-full w-full min-w-0 gap-1 p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card shadow-soft hover:shadow-pop transition-all duration-200',
        href && 'group-hover:border-primary/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] sm:text-[11.5px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn('flex size-6.5 sm:size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', toneChip[tone])}>
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        {loading ? (
          <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
        ) : (
          <p className="min-w-0 truncate text-base sm:text-lg xl:text-xl font-bold tracking-tight text-foreground" title={typeof value === 'string' ? value : undefined}>
            {value}
          </p>
        )}
        {spark && !loading ? <Sparkline values={spark.values} label={spark.label} /> : null}
      </div>
      {loading ? (
        <Skeleton className="h-3 w-28" />
      ) : trend || hint ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {trend ? <TrendPill trend={trend} /> : null}
          {hint ? (
            <span className="min-w-0 max-w-full text-[10.5px] leading-snug text-muted-foreground line-clamp-2" title={typeof hint === 'string' ? hint : undefined}>
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  )

  if (!href) return body
  return (
    <Link to={href} className="group block w-full min-w-0 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
      {body}
    </Link>
  )
}
