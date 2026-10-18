import { useId, type ReactNode } from 'react'
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartInk, seriesColor } from '@/components/charts/colors'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { rowsFromPayload } from '@/components/charts/tooltip-rows'

export type TrendSeries = {
  key: string
  name: string
  /** How the series is drawn. Lines for trends, bars for amounts per period, areas for one series that is the point. */
  kind?: 'area' | 'line' | 'bar'
  /** Defaults to the next categorical slot in order. */
  color?: string
  /** Dashed stroke: marks a forecast so it is never read as an actual. */
  dashed?: boolean
  /** How a value reads in the tooltip. */
  format?: (value: number) => ReactNode
}

export type TrendDatum = Record<string, string | number | null>

type TrendChartProps = {
  data: TrendDatum[]
  xKey: string
  series: TrendSeries[]
  /** Tick text of the x axis. */
  xFormat?: (value: string | number) => string
  /** Tick text of the y axis (compact: `₹2.5L`). */
  yFormat?: (value: number) => string
  /** Heading of the tooltip for one x position. */
  tooltipTitle?: (value: string | number) => ReactNode
  /** Plot height in px, including the x-axis band. */
  height?: number
  /** One sentence for screen readers saying what the chart shows. */
  description: string
  /** Stack the bar series on top of each other. */
  stacked?: boolean
}

const BAR_MAX = 24

/**
 * Time series on a single axis with smooth gradient fills, high-contrast grid lines,
 * snappy vertical hover guidance, and rich multi-series tooltips.
 */
export function TrendChart({
  data,
  xKey,
  series,
  xFormat,
  yFormat,
  tooltipTitle,
  height = 200,
  description,
  stacked = false,
}: TrendChartProps) {
  const uid = useId()
  const colors = series.map((s, i) => s.color ?? seriesColor(i))
  const colorByKey = Object.fromEntries(series.map((s, i) => [s.key, colors[i]!]))
  const marks = Object.fromEntries(series.map((s) => [s.key, s.kind === 'bar' || s.kind === 'area' ? 'swatch' : 'line'])) as Record<string, 'line' | 'swatch'>
  const formatBySeries = Object.fromEntries(series.map((s) => [s.key, s.format]))
  const hasBars = series.some((s) => s.kind === 'bar')
  const sparse = data.length < 3

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl bg-slate-50/50 dark:bg-slate-950/40 p-1.5 sm:p-2 border border-border/40 dark:border-slate-800/40 transition-colors" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} desc={description}>
          <defs>
            {series.map((s, i) => {
              const color = colors[i]!
              return (
                <linearGradient key={`grad-${s.key}`} id={`grad-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid vertical={false} stroke={chartInk.grid} strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: chartInk.axis }}
            tick={{ fill: chartInk.label, fontSize: 11, fontWeight: 500 }}
            tickMargin={8}
            tickFormatter={xFormat}
            minTickGap={16}
          />
          <YAxis
            width="auto"
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartInk.label, fontSize: 11, fontWeight: 500 }}
            tickMargin={8}
            tickFormatter={yFormat}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <Tooltip
            cursor={
              hasBars
                ? { fill: 'rgba(59, 130, 246, 0.06)' }
                : { stroke: 'rgba(59, 130, 246, 0.4)', strokeWidth: 1.5, strokeDasharray: '3 3' }
            }
            isAnimationActive={false}
            content={(tip) => {
              if (!tip.active || !tip.payload?.length) return null
              const rows = rowsFromPayload(tip.payload, {
                format: (value, key) => formatBySeries[key]?.(value) ?? value.toLocaleString('en-IN'),
                marks,
                colors: colorByKey,
              })
              const label = tip.label ?? ''
              return <ChartTooltip title={tooltipTitle ? tooltipTitle(label) : xFormat ? xFormat(label) : String(label)} rows={rows} />
            }}
          />
          {series.map((s, i) => {
            const color = colors[i]!
            if (s.kind === 'bar') {
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={color}
                  stackId={stacked ? `${uid}-stack` : undefined}
                  maxBarSize={BAR_MAX}
                  radius={stacked ? 0 : [6, 6, 0, 0]}
                  stroke={stacked ? chartInk.surface : undefined}
                  strokeWidth={stacked ? 2 : 0}
                  isAnimationActive={true}
                  animationDuration={850}
                  animationEasing="ease-out"
                  className="transition-all duration-150 hover:brightness-110 hover:opacity-95 cursor-pointer"
                />
              )
            }
            if (s.kind === 'area') {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                  fill={`url(#grad-${uid}-${s.key})`}
                  dot={sparse ? { r: 4, fill: color, stroke: chartInk.surface, strokeWidth: 2 } : false}
                  activeDot={{ r: 6, fill: color, stroke: chartInk.surface, strokeWidth: 3 }}
                  isAnimationActive={true}
                  animationDuration={950}
                  animationEasing="ease-out"
                  connectNulls
                />
              )
            }
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? '5 4' : undefined}
                dot={sparse ? { r: 4, fill: color, stroke: chartInk.surface, strokeWidth: 2 } : false}
                activeDot={{ r: 6, fill: color, stroke: chartInk.surface, strokeWidth: 3 }}
                isAnimationActive={true}
                animationDuration={950}
                animationEasing="ease-out"
                connectNulls
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
