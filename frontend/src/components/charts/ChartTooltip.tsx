import type { ReactNode } from 'react'

export type TooltipRow = {
  key: string
  name: string
  value: ReactNode
  color: string
  /** `line` keys a series that is drawn as a line, `swatch` one drawn as a fill. */
  mark?: 'line' | 'swatch'
}

type ChartTooltipProps = {
  /** Heading of the readout: usually the x value or date. */
  title?: ReactNode
  rows: TooltipRow[]
  /** A note under the rows, e.g. "Forecast". */
  footer?: ReactNode
}

function parseNumber(val: ReactNode): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }
  return null
}

/**
 * Universal interactive chart tooltip with high contrast, clear value indicators,
 * percentage breakdown for multiple series, and crisp light/dark mode formatting.
 */
export function ChartTooltip({ title, rows, footer }: ChartTooltipProps) {
  // If multiple rows have numeric values, calculate total for percentage breakdown
  const numbers = rows.map((r) => parseNumber(r.value))
  const hasMultipleNumbers = rows.length > 1 && numbers.every((n) => n !== null)
  const total = hasMultipleNumbers ? numbers.reduce((a, b) => (a ?? 0) + (b ?? 0), 0) : 0

  return (
    <div
      role="status"
      className="min-w-48 max-w-xs rounded-xl border border-border/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-3 text-popover-foreground dark:text-slate-100 shadow-xl pointer-events-none transition-all duration-100"
    >
      {title ? (
        <div className="mb-2 pb-1.5 border-b border-border/50 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground dark:text-white truncate">{title}</span>
          {rows.length > 1 && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {rows.length} Series
            </span>
          )}
        </div>
      ) : null}

      <ul className="grid gap-2">
        {rows.map((row, idx) => {
          const num = numbers[idx]
          const pct = hasMultipleNumbers && total && total > 0 && num !== null ? Math.round((num / total) * 100) : null

          return (
            <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={
                    row.mark === 'swatch'
                      ? 'size-2.5 shrink-0 rounded-sm shadow-xs'
                      : 'h-[3.5px] w-3.5 shrink-0 rounded-full'
                  }
                  style={{ background: row.color, boxShadow: `0 0 6px ${row.color}40` }}
                />
                <span className="truncate text-xs font-medium text-muted-foreground dark:text-slate-300">
                  {row.name}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="font-bold tabular text-foreground dark:text-white">
                  {row.value}
                </span>
                {pct !== null && (
                  <span className="text-[10px] font-semibold text-muted-foreground/80 dark:text-slate-400">
                    ({pct}%)
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {footer ? (
        <p className="mt-2 border-t border-border/50 dark:border-slate-800 pt-1.5 text-[11px] text-muted-foreground dark:text-slate-400 font-medium">
          {footer}
        </p>
      ) : null}
    </div>
  )
}
