import { useState, type ReactNode } from 'react'
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts'
import type { PieSectorShapeProps } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { chartInk } from '@/components/charts/colors'
import { formatNumber, formatPercent, percentOf } from '@/lib/format'
import { cn } from '@/lib/utils'

export type DonutDatum = { key: string; label: string; value: number; color: string }

type DonutChartProps = {
  data: DonutDatum[]
  /** Small caption in the middle of the ring ("Total"). */
  centerLabel?: string
  /** The figure in the middle of the ring (already formatted). Defaults to the sum. */
  centerValue?: ReactNode
  /** How a value reads in the legend and tooltip. */
  format?: (value: number) => string
  description: string
  size?: number
}

/**
 * Part to whole for a handful of segments with dynamic center readouts,
 * interactive legend highlighting, and proportional progress indicators for instant comprehension.
 */
export function DonutChart({ data, centerLabel = 'Total', centerValue, format = formatNumber, description, size = 156 }: DonutChartProps) {
  const [activeDatum, setActiveDatum] = useState<DonutDatum | null>(null)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const live = data.filter((d) => d.value > 0)

  const activeIndex = activeDatum ? live.findIndex((d) => d.key === activeDatum.key) : -1

  const shape = (props: PieSectorShapeProps) => {
    const datum = (props.payload ?? {}) as Partial<DonutDatum>
    const isHovered = activeDatum && activeDatum.key === datum.key
    const isOtherHovered = activeDatum && activeDatum.key !== datum.key

    return (
      <Sector
        {...props}
        fill={datum.color ?? 'var(--chart-other)'}
        stroke="var(--chart-surface)"
        strokeWidth={isHovered ? 3 : 2}
        className={cn(
          'transition-all duration-200 cursor-pointer outline-none',
          isHovered && 'scale-[1.03] filter drop-shadow(0 0 6px rgba(0,0,0,0.25))',
          isOtherHovered && 'opacity-40'
        )}
      />
    )
  }

  const currentDisplayValue = activeDatum ? format(activeDatum.value) : (centerValue ?? format(total))
  const currentDisplayLabel = activeDatum ? activeDatum.label : centerLabel
  const currentDisplayShare = activeDatum && total > 0 ? formatPercent(percentOf(activeDatum.value, total), 1) : null

  return (
    <div className="w-full min-w-0 overflow-hidden flex flex-col items-center gap-6 sm:flex-row sm:items-center rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 p-4 sm:p-5 border border-border/40 dark:border-slate-800/40 transition-colors">
      {/* Donut Ring with Interactive Live Center */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart desc={description}>
            {total === 0 ? (
              <Pie data={[{ value: 1 }]} dataKey="value" innerRadius="68%" outerRadius="100%" fill={chartInk.grid} stroke="none" isAnimationActive={false} />
            ) : (
              <Pie
                data={live}
                dataKey="value"
                nameKey="label"
                innerRadius="68%"
                outerRadius="100%"
                paddingAngle={live.length > 1 ? 2.5 : 0}
                startAngle={90}
                endAngle={-270}
                shape={shape}
                isAnimationActive={true}
                animationDuration={850}
                animationEasing="ease-out"
                onMouseEnter={(_, index) => setActiveDatum(live[index] ?? null)}
                onMouseLeave={() => setActiveDatum(null)}
              />
            )}
            <Tooltip
              isAnimationActive={false}
              content={(tip) => {
                if (!tip.active || !tip.payload?.length) return null
                const datum = tip.payload[0]?.payload as DonutDatum | undefined
                if (!datum) return null
                return (
                  <ChartTooltip
                    title={datum.label}
                    rows={[{
                      key: datum.key,
                      name: `${formatPercent(percentOf(datum.value, total))} share`,
                      value: format(datum.value),
                      color: datum.color,
                      mark: 'swatch',
                    }]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Live Center HUD */}
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center px-4">
          <div className="absolute inset-4 rounded-full bg-primary/[0.03] dark:bg-primary/[0.06] -z-10" />
          <span className="text-xl sm:text-2xl leading-none font-bold tracking-tight text-foreground dark:text-white truncate">
            {currentDisplayValue}
          </span>
          <span className="mt-1 text-[11px] font-semibold text-muted-foreground dark:text-slate-400 tracking-wider uppercase truncate max-w-[110px]">
            {currentDisplayLabel}
          </span>
          {currentDisplayShare && (
            <span className="mt-0.5 inline-block text-[10px] font-bold text-primary dark:text-blue-400">
              {currentDisplayShare} of total
            </span>
          )}
        </div>
      </div>

      {/* Explanatory Legend with Proportional Bars */}
      <div className="w-full min-w-0 flex-1 grid gap-2.5">
        {data.map((d) => {
          const share = percentOf(d.value, total)
          const isSelected = activeDatum?.key === d.key

          return (
            <div
              key={d.key}
              onMouseEnter={() => setActiveDatum(d)}
              onMouseLeave={() => setActiveDatum(null)}
              className={cn(
                'group flex flex-col gap-1 p-1.5 rounded-xl transition-all duration-150 cursor-pointer',
                isSelected ? 'bg-primary/10 dark:bg-blue-950/40 shadow-xs' : 'hover:bg-slate-100/70 dark:hover:bg-slate-850/60'
              )}
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 shrink-0 rounded-[3px] transition-transform group-hover:scale-125"
                    style={{ background: d.color, boxShadow: `0 0 6px ${d.color}40` }}
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {d.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="font-bold tabular text-foreground dark:text-white">
                    {format(d.value)}
                  </span>
                  <span className="w-9 text-right text-[11px] font-semibold text-muted-foreground dark:text-slate-400">
                    {formatPercent(share, 0)}
                  </span>
                </div>
              </div>

              {/* Visual Micro Progress Bar */}
              <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(2, share)}%`,
                    background: d.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
