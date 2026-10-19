import { useState, type ReactNode } from 'react'
import { ArrowRight, BarChart3, Table2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChartLegend, type LegendItem } from '@/components/charts/ChartLegend'
import { ChartTable, type ChartTableModel } from '@/components/charts/ChartTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

/**
 * A chart in an interactive card with dual-mode toggle pills (2D Chart / Data Table).
 */
export function ChartCard({
  title,
  description,
  actions,
  legend,
  table,
  hideInsights: _hideInsights,
  loading,
  error,
  onRetry,
  empty,
  stale,
  drillDown,
  footer: _footer,
  height = 200,
  className,
  children,
}: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const ready = !loading && !error && !empty

  return (
    <Card className={cn('w-full min-w-0 overflow-hidden bg-card border border-border/80 dark:border-slate-800/80 shadow-soft hover:shadow-pop hover:border-primary/40 dark:hover:border-blue-500/40 transition-all duration-200', className)}>
      <CardHeader>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/70 animate-pulse" aria-hidden="true" />
              <CardTitle>{title}</CardTitle>
            </div>
          </div>
          {description ? <CardDescription>{description}</CardDescription> : null}
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
