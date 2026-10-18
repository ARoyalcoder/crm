import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ordinalColors } from '@/components/charts/colors'
import { formatNumber, formatPercent, percentOf } from '@/lib/format'

export type FunnelStage = {
  key: string
  label: string
  value: number
  /** Replaces the plain count (e.g. an amount). */
  display?: ReactNode
  /** Where the records behind this stage can be listed. */
  href?: string
}

type FunnelBarsProps = {
  stages: FunnelStage[]
  /** Names the list for screen readers. */
  label: string
}

/**
 * A funnel as ranked bars on the ordinal ramp. Each stage shows:
 * 1. Step number & stage name
 * 2. Current count / volume
 * 3. Step-to-step retention rate ("X% of previous")
 * 4. Overall conversion rate ("Y% of start")
 * so the pipeline drop-off is immediately understood without arithmetic.
 */
export function FunnelBars({ stages, label }: FunnelBarsProps) {
  const colors = ordinalColors(stages.length)
  const top = stages[0]?.value ?? Math.max(...stages.map((s) => s.value), 0)

  return (
    <ol aria-label={label} className="grid gap-1">
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1]!.value : null
        const width = top > 0 ? Math.max(stage.value > 0 ? 2 : 0, percentOf(stage.value, top)) : 0
        const overallRate = top > 0 ? formatPercent(percentOf(stage.value, top), 0) : '0%'

        const name = stage.href ? (
          <Link to={stage.href} className="font-semibold text-foreground hover:text-primary transition-colors hover:underline">
            {stage.label}
          </Link>
        ) : (
          <span className="font-semibold text-foreground">{stage.label}</span>
        )

        return (
          <li key={stage.key} className="group grid gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 hover:bg-slate-100/60 dark:hover:bg-slate-850/50">
            <div className="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="truncate">{name}</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                  {overallRate} of start
                </span>
              </div>

              <div className="flex items-baseline gap-2 shrink-0">
                <span className="font-bold tabular text-foreground dark:text-white">
                  {stage.display ?? formatNumber(stage.value)}
                </span>
                {previous !== null && previous > 0 ? (
                  <span className="w-24 text-right text-[11px] font-semibold text-muted-foreground dark:text-slate-400">
                    {formatPercent(percentOf(stage.value, previous), 0)} retained
                  </span>
                ) : (
                  <span className="w-24 text-right text-[11px] font-semibold text-primary dark:text-blue-400">
                    Baseline
                  </span>
                )}
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/40 dark:border-slate-700/50" aria-hidden="true">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-xs group-hover:brightness-110"
                style={{ width: `${width}%`, background: colors[index] }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
