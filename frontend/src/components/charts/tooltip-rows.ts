import type { ReactNode } from 'react'
import type { TooltipContentProps } from 'recharts'
import type { TooltipRow } from '@/components/charts/ChartTooltip'

type Payload = NonNullable<TooltipContentProps['payload']>[number]

/** Turns Recharts' payload entries into rows, formatting values with the series' own formatter. */
export function rowsFromPayload(
  payload: TooltipContentProps['payload'] | undefined,
  options: { format?: (value: number, series: string) => ReactNode; marks?: Record<string, 'line' | 'swatch'>; colors?: Record<string, string> } = {},
): TooltipRow[] {
  if (!payload) return []
  return payload
    .filter((entry: Payload) => entry.value !== null && entry.value !== undefined && entry.type !== 'none')
    .map((entry: Payload) => {
      const key = String(entry.dataKey ?? entry.name ?? '')
      const raw = typeof entry.value === 'number' ? entry.value : Number(entry.value)
      return {
        key,
        name: String(entry.name ?? key),
        value: options.format && Number.isFinite(raw) ? options.format(raw, key) : String(entry.value),
        color: options.colors?.[key] ?? String(entry.color ?? entry.stroke ?? entry.fill ?? 'var(--chart-other)'),
        mark: options.marks?.[key] ?? 'swatch',
      }
    })
}
