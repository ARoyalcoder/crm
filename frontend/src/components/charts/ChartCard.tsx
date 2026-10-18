import { useState, useMemo, type ReactNode } from 'react'
import { ArrowRight, BarChart3, Table2, TrendingUp, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChartLegend, type LegendItem } from '@/components/charts/ChartLegend'
import { ChartTable, type ChartTableModel } from '@/components/charts/ChartTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ChartCardProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  legend?: LegendItem[]
  table?: ChartTableModel
  hideInsights?: boolean
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: { title: string; description?: ReactNode; action?: ReactNode } | false
  stale?: boolean
  drillDown?: { to: string; label: string }
  footer?: ReactNode
  height?: number
  className?: string
  children: ReactNode
}

type ChartDatum = {
  label: string
  value: number
  formatted?: string
}

/**
 * Extracts numeric values and formatted labels from a ChartTableModel
 * to compute automated high-level insights (Peak, Total, Average) for customer understanding.
 */
function extractInsightsData(table?: ChartTableModel): ChartDatum[] {
  if (!table || !table.rows || table.rows.length === 0 || !table.columns || table.columns.length === 0) return []

  const columns = table.columns
  const labelCol = columns.find((c) => c.align !== 'right') || columns[0]
  const preferredKeys = ['amount', 'invoiced', 'collected', 'total', 'revenue', 'count', 'value', 'payments', 'outstanding']
  const valueCol =
    columns.find((c) => preferredKeys.includes(c.key.toLowerCase())) ||
    columns.find((c) => c.align === 'right') ||
    (columns.length > 1 ? columns[1] : columns[0])

  if (!labelCol || !valueCol) return []

  const result: ChartDatum[] = []
  for (const row of table.rows) {
    const rawLabel = row[labelCol.key]
    const rawVal = row[valueCol.key]

    let numVal: number | null = null
    let formattedVal: string | undefined

    if (typeof rawVal === 'number') {
      numVal = isNaN(rawVal) ? null : rawVal
      formattedVal = rawVal.toLocaleString('en-IN')
    } else if (typeof rawVal === 'string') {
      formattedVal = rawVal
      const cleaned = rawVal.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(cleaned)
      if (!isNaN(parsed)) {
        numVal = parsed
      }
    }

    if (numVal !== null && numVal >= 0) {
      result.push({
        label: typeof rawLabel === 'string' || typeof rawLabel === 'number' ? String(rawLabel) : 'Item',
        value: numVal,
        formatted: formattedVal,
      })
    }
  }

  return result
}

function formatDerivedNumber(num: number, sampleFormatted?: string): string {
  if (sampleFormatted && sampleFormatted.includes('₹')) {
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })}`
  }
  if (sampleFormatted && sampleFormatted.includes('$')) {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })}`
  }
  if (sampleFormatted && sampleFormatted.includes('%')) {
    return `${num.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
  }
  return num.toLocaleString('en-IN', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })
}

/**
 * A chart in an interactive glass card with dynamic sheen, dual-mode toggle pills
 * (2D Chart / Data Table), and human-friendly quick insight badges for instant customer understanding.
 */
export function ChartCard({
  title,
  description,
  actions,
  legend,
  table,
  hideInsights = false,
  loading,
  error,
  onRetry,
  empty,
  stale,
  drillDown,
  footer,
  height = 200,
  className,
  children,
}: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const ready = !loading && !error && !empty

  // High-level insights for user/customer clarity
  const chartItems = useMemo(() => extractInsightsData(table), [table])

  const insights = useMemo(() => {
    if (hideInsights || !chartItems.length) return null
    const validValues = chartItems.map((d) => d.value).filter((v) => !isNaN(v))
    if (!validValues.length) return null

    const total = validValues.reduce((acc, curr) => acc + curr, 0)
    const maxVal = Math.max(...validValues, 0)
    const maxItem = chartItems.find((d) => d.value === maxVal)
    const avg = total / validValues.length
    const sample = chartItems.find((d) => d.formatted)?.formatted

    return {
      totalFormatted: formatDerivedNumber(total, sample),
      peakLabel: maxItem?.label ?? 'N/A',
      peakFormatted: maxItem?.formatted ?? formatDerivedNumber(maxVal, sample),
      avgFormatted: formatDerivedNumber(avg, sample),
      count: validValues.length,
    }
  }, [chartItems, hideInsights])

  return (
    <Card className={cn('w-full min-w-0 overflow-hidden bg-card border border-border/80 dark:border-slate-800/80 shadow-soft hover:shadow-pop hover:border-primary/40 dark:hover:border-blue-500/40 transition-all duration-200', className)}>
      <CardHeader>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/70 animate-pulse" aria-hidden="true" />
              <CardTitle>{title}</CardTitle>
            </div>
            {footer && (
              <TooltipProvider delay={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded-full"
                      aria-label="Chart details"
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {footer}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}

          {/* Quick Insights Ribbon for Instant User & Customer Comprehension */}
          {ready && insights && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10.5px] font-medium">
              <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-md bg-blue-50/90 dark:bg-blue-950/60 text-[#2B66FE] dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-900/40">
                <TrendingUp className="size-3" />
                Peak: <strong>{insights.peakLabel}</strong> ({insights.peakFormatted})
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-md bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                Total: <strong>{insights.totalFormatted}</strong>
              </span>
              {insights.count > 2 && (
                <span className="hidden 2xl:inline-flex items-center gap-1 px-1.5 py-px rounded-md bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                  Avg: <strong>{insights.avgFormatted}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {(actions || (table && ready)) ? (
          <CardAction>
            {actions}
            {table && ready ? (
              <div
                role="group"
                aria-label={`${title} view`}
                className="relative inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
              >
                {/* 2D Chart View */}
                <button
                  type="button"
                  aria-pressed={view === 'chart'}
                  onClick={() => setView('chart')}
                  className="relative z-10 inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white aria-pressed:text-primary dark:aria-pressed:text-blue-400"
                >
                  {view === 'chart' && (
                    <motion.div
                      layoutId={`chart-pill-${title}`}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      className="absolute inset-0 rounded-lg bg-white dark:bg-slate-900 shadow-soft"
                    />
                  )}
                  <BarChart3 className="relative z-10 size-3.5" aria-hidden="true" />
                  <span className="relative z-10">Chart</span>
                </button>

                {/* Table View */}
                <button
                  type="button"
                  aria-pressed={view === 'table'}
                  onClick={() => setView('table')}
                  className="relative z-10 inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:hover:text-white aria-pressed:text-primary dark:aria-pressed:text-blue-400"
                >
                  {view === 'table' && (
                    <motion.div
                      layoutId={`chart-pill-${title}`}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      className="absolute inset-0 rounded-lg bg-white dark:bg-slate-900 shadow-soft"
                    />
                  )}
                  <Table2 className="relative z-10 size-3.5" aria-hidden="true" />
                  <span className="relative z-10">Table</span>
                </button>
              </div>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-2 min-w-0 overflow-hidden">
        {ready && legend && legend.length > 1 && view === 'chart' ? (
          <ChartLegend items={legend} />
        ) : null}
        {loading ? (
          <SkeletonLoader variant="chart" height={height} label={`Loading ${title.toLowerCase()}`} />
        ) : error ? (
          <ErrorState variant="compact" title={`Could not load ${title.toLowerCase()}`} error={error} onRetry={onRetry} />
        ) : empty ? (
          <EmptyState variant="compact" title={empty.title} description={empty.description} action={empty.action} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={cn('transition-opacity w-full min-w-0 overflow-hidden', stale && 'opacity-60')}
              aria-busy={stale || undefined}
            >
              {view === 'table' ? (
                <ChartTable {...table!} />
              ) : (
                children
              )}
            </motion.div>
          </AnimatePresence>
        )}
        {footer && ready && view !== 'table' ? (
          <p className="text-xs text-muted-foreground dark:text-slate-400 font-medium">{footer}</p>
        ) : null}
        {drillDown && ready ? (
          <Link to={drillDown.to} className="group/link inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary hover:text-primary/90 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
            {drillDown.label}
            <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  )
}
