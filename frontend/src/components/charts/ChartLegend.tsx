import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type LegendItem = {
  key: string
  label: string
  color: string
  /** `line` for a series drawn as a line, `swatch` (default) for a fill. */
  mark?: 'line' | 'swatch'
  /** A figure shown after the name, e.g. the total or the share. */
  value?: ReactNode
  /** Dashed key: marks a forecast, kept visibly apart from actual values. */
  dashed?: boolean
}

type ChartLegendProps = {
  items: LegendItem[]
  className?: string
  /** Stack the items in one column with their values aligned to the right (beside a donut). */
  layout?: 'inline' | 'list'
}

/**
 * The legend. Always present for two or more series: it is the dependable identity channel, and
 * direct labels only supplement it. Text stays in text colours; the colour lives on the key beside it.
 */
export function ChartLegend({ items, className, layout = 'inline' }: ChartLegendProps) {
  if (items.length === 0) return null
  return (
    <ul
      aria-label="Legend"
      className={cn(layout === 'inline' ? 'flex flex-wrap items-center gap-x-4 gap-y-1.5' : 'grid gap-2', className)}
    >
      {items.map((item) => (
        <li key={item.key} className={cn('flex items-center gap-2 text-sm', layout === 'list' && 'justify-between')}>
          <span className="flex min-w-0 items-center gap-2">
            {item.mark === 'line' ? (
              <span
                aria-hidden="true"
                className="h-[3px] w-4 shrink-0 rounded-full"
                style={item.dashed ? { background: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)` } : { background: item.color }}
              />
            ) : (
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color }} />
            )}
            <span className="truncate text-muted-foreground dark:text-slate-300 font-medium">{item.label}</span>
          </span>
          {item.value !== undefined ? <span className="font-semibold text-foreground dark:text-white tabular">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  )
}
