/**
 * Chart colours, all as CSS variables so light and dark themes swap without any JavaScript.
 *
 * Rules these helpers keep (from the data-viz method this product follows):
 *  - Categorical hues are assigned in a fixed order and never cycled. Past eight series the tail is "Other".
 *  - Colour follows the entity, not its rank: a vertical keeps its colour whatever is filtered out.
 *  - Ordered things (funnel stages, age bands) take the one-hue ordinal ramp, light to dark.
 *  - Status colours are reserved for things that mean good or bad, and always carry an icon and a label.
 */

const SLOTS = 8

/** Categorical slot 1..8. Index 0 is the first series. Anything past the eighth is the neutral "Other" colour. */
export function seriesColor(index: number): string {
  return index >= 0 && index < SLOTS ? `var(--chart-${index + 1})` : 'var(--chart-other)'
}

/** The six verticals each own one slot for good, so a vertical reads the same on every chart. */
const VERTICAL_SLOT: Record<string, number> = {
  CCTV_SECURITY: 0,
  DIGITAL_MARKETING: 1,
  INTERIOR_DESIGN: 2,
  ARCHITECTURE_TECH: 3,
  SOLAR: 4,
  IT_SUPPORT: 5,
}

export function verticalColor(code: string | null | undefined): string {
  const slot = code ? VERTICAL_SLOT[code] : undefined
  return slot === undefined ? 'var(--chart-other)' : seriesColor(slot)
}

/** `n` steps of the ordinal ramp, first (lightest) to last (darkest), evenly spread over its six anchors. */
export function ordinalColors(n: number): string[] {
  if (n <= 0) return []
  if (n === 1) return ['var(--ord-3)']
  const anchors = 6
  return Array.from({ length: n }, (_, i) => {
    const position = (i / (n - 1)) * (anchors - 1)
    const low = Math.floor(position)
    const high = Math.min(anchors, low + 2)
    const mix = position - low
    if (mix < 0.001) return `var(--ord-${low + 1})`
    return `color-mix(in oklab, var(--ord-${high}) ${Math.round(mix * 100)}%, var(--ord-${low + 1}))`
  })
}

/** Fixed marks for status-bearing series (overdue, breached, on time). Always pair with an icon and a label. */
export const statusColor = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
} as const

/** Chart furniture. */
export const chartInk = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  label: 'var(--chart-label)',
  surface: 'var(--chart-surface)',
} as const
