import { useId, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BarShapeProps } from 'recharts'
import { chartInk, seriesColor } from '@/components/charts/colors'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { rowsFromPayload } from '@/components/charts/tooltip-rows'

export type BarSeries = {
  key: string
  name: string
  color?: string
  format?: (value: number) => ReactNode
}

export type BarDatum = { label: string; [key: string]: string | number | null }

type BarsChartProps = {
  data: BarDatum[]
  series: BarSeries[]
  /** `columns` stand the bars up (time, few categories); `bars` lay them down (ranked lists, long names). */
  orientation?: 'columns' | 'bars'
  stacked?: boolean
  /** One colour per bar, by entity or by ordinal position. Only for a single series: colour must never double-encode length. */
  colorBy?: (datum: BarDatum, index: number) => string
  /** Axis / label formatting for the value scale (compact: `₹2.5L`). */
  valueFormat?: (value: number) => string
  /** Print the value at the tip of each bar when there is room for it. */
  tipLabels?: boolean
  /** Height in px, including the axis band. Horizontal bars default to a row height per bar. */
  height?: number
  description: string
  onBarClick?: (datum: BarDatum) => void
}

const BAR_MAX = 24
const ROW = 34

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Compare magnitudes across categories with clear value readouts,
 * subtle guide tracks, readable tip labels, and interactive hover feedback.
 */
export function BarsChart({
  data,
  series,
  orientation = 'columns',
  stacked = false,
  colorBy,
  valueFormat,
  tipLabels = false,
  height,
  description,
  onBarClick,
}: BarsChartProps) {
  const uid = useId()
  const horizontal = orientation === 'bars'
  const plotHeight = height ?? (horizontal ? Math.max(120, data.length * ROW + 28) : 200)
  const colors = series.map((s, i) => s.color ?? seriesColor(i))
  const marks = Object.fromEntries(series.map((s) => [s.key, 'swatch'])) as Record<string, 'swatch'>
  const formatBySeries = Object.fromEntries(series.map((s) => [s.key, s.format]))
  const colorByKey = Object.fromEntries(series.map((s, i) => [s.key, colors[i]!]))
  const single = series.length === 1

  const valueAxis = {
    tickLine: false,
    axisLine: false,
    tick: { fill: chartInk.label, fontSize: 11, fontWeight: 500 },
    tickMargin: 8,
    tickFormatter: valueFormat,
    allowDecimals: false,
  } as const

  const categoryAxis = {
    tickLine: false,
    axisLine: { stroke: chartInk.axis },
    tick: { fill: chartInk.label, fontSize: 11, fontWeight: 500 },
    tickMargin: 8,
  } as const

  const tooltip = (
    <Tooltip
      cursor={{ fill: 'rgba(59, 130, 246, 0.07)', radius: 4 }}
      isAnimationActive={false}
      content={(tip) => {
        if (!tip.active || !tip.payload?.length) return null
        const rows = rowsFromPayload(tip.payload, {
          format: (value, key) => formatBySeries[key]?.(value) ?? (valueFormat ? valueFormat(value) : value.toLocaleString('en-IN')),
          marks,
          colors: colorByKey,
        })
        // A single series coloured per bar shows that bar's own colour in the key.
        if (single && colorBy && tip.payload[0]?.payload) {
          const datum = tip.payload[0].payload as BarDatum
          const index = data.indexOf(datum)
          if (index >= 0 && rows[0]) rows[0] = { ...rows[0], color: colorBy(datum, index) }
        }
        return <ChartTooltip title={String(tip.label ?? '')} rows={rows} />
      }}
    />
  )

  const bars = series.map((s, i) => {
    const color = colors[i]!
    const shape = (props: BarShapeProps) => {
      const datum = props.payload as BarDatum | undefined
      const index = datum ? data.indexOf(datum) : -1
      const fill = single && colorBy && datum && index >= 0 ? colorBy(datum, index) : color
      // Rounded at the data end only, square on the baseline; stacked segments are separated by a surface-coloured gap.
      const radius = stacked ? 0 : horizontal ? ([0, 6, 6, 0] as [number, number, number, number]) : ([6, 6, 0, 0] as [number, number, number, number])
      return (
        <Rectangle
          {...props}
          fill={fill}
          radius={radius}
          stroke={stacked ? chartInk.surface : undefined}
          strokeWidth={stacked ? 2 : 0}
          cursor={onBarClick ? 'pointer' : 'default'}
          className="transition-all duration-150 hover:brightness-110 hover:opacity-95 cursor-pointer filter hover:drop-shadow-[0_2px_8px_rgba(43,102,254,0.3)]"
        />
      )
    }
    return (
      <Bar
        key={s.key}
        dataKey={s.key}
        name={s.name}
        fill={color}
        stackId={stacked ? `${uid}-stack` : undefined}
        maxBarSize={BAR_MAX}
        shape={shape}
        isAnimationActive={true}
        animationDuration={800}
        animationEasing="ease-out"
        onClick={onBarClick ? (item) => onBarClick(item.payload as BarDatum) : undefined}
      >
        {tipLabels && single ? (
          <LabelList
            dataKey={s.key}
            position={horizontal ? 'right' : 'top'}
            fill={chartInk.label}
            fontSize={11}
            fontWeight={600}
            formatter={(value: unknown) => (typeof value === 'number' ? (valueFormat ? valueFormat(value) : value.toLocaleString('en-IN')) : '')}
          />
        ) : null}
      </Bar>
    )
  })

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl bg-slate-50/50 dark:bg-slate-950/40 p-1.5 sm:p-2 border border-border/40 dark:border-slate-800/40 transition-colors" style={{ height: plotHeight }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {horizontal ? (
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: tipLabels ? 56 : 14, bottom: 4, left: 4 }} desc={description}>
            <CartesianGrid horizontal={false} stroke={chartInk.grid} strokeWidth={1} />
            <XAxis type="number" {...valueAxis} domain={[0, 'auto']} />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              {...categoryAxis}
              axisLine={false}
              tickFormatter={(value: string) => truncate(String(value), 20)}
              interval={0}
            />
            {tooltip}
            {bars}
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: tipLabels ? 22 : 12, right: 12, bottom: 4, left: 4 }} desc={description}>
            <CartesianGrid vertical={false} stroke={chartInk.grid} strokeWidth={1} />
            <XAxis dataKey="label" {...categoryAxis} tickFormatter={(value: string) => truncate(String(value), 14)} interval={0} />
            <YAxis width="auto" type="number" {...valueAxis} domain={[0, 'auto']} />
            {tooltip}
            {bars}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
