import { cn } from '@/lib/utils'

type SparklineProps = {
  /** Oldest first. At least two points draw a line; fewer draws nothing. */
  values: number[]
  /** Stroke colour. Defaults to the brand slot. */
  color?: string
  className?: string
  width?: number
  height?: number
  /** Spoken description: "Revenue, last 12 months, rising". Without one the sparkline is decorative. */
  label?: string
}

/**
 * A tiny trend line for a stat tile: 2px stroke, a soft wash under it, and a ringed dot on the latest
 * value. Plain SVG at its real size (never stretched, so the dot stays round): no axes, no tooltip,
 * nothing to hover. The number beside it is the data.
 */
export function Sparkline({ values, color = 'var(--chart-1)', className, width = 96, height = 28, label }: SparklineProps) {
  if (values.length < 2) return null
  const pad = 4
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2)
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2)
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
  const line = `M${points.join(' L')}`
  const area = `${line} L${x(values.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`
  const last = values.length - 1

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={area} fill={color} fillOpacity={0.12} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last]!)} r={5.5} fill={color} fillOpacity={0.25} className="animate-ping" />
      <circle cx={x(last)} cy={y(values[last]!)} r={3.5} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
    </svg>
  )
}
