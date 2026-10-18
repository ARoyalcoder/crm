import type { StatTrend } from '@/components/shared/StatCard'
import type { Compared, CountCompared, Period } from '@/features/analytics/api'
import { formatDate, formatDateShort, formatMonth, formatRupees } from '@/lib/format'

/**
 * Percent change of a figure against the same figure one period earlier. `null` (never 0%) when there is
 * nothing to compare with: a first month cannot "grow 0%", it simply has no past.
 */
export function changePct(compared: Compared | CountCompared | null | undefined): number | null {
  if (!compared || compared.previous === 0) return null
  return ((compared.value - compared.previous) / Math.abs(compared.previous)) * 100
}

/** What a StatCard needs to show how a figure moved: the change, which direction is good, and what it is compared with. */
export function trendOf(
  compared: Compared | CountCompared | null | undefined,
  period: Period | undefined,
  goodWhen: 'up' | 'down' = 'up',
): StatTrend | undefined {
  if (!compared) return undefined
  return { change: changePct(compared), goodWhen, versus: period ? `vs previous ${period.days} days` : undefined }
}

/** `14 Sep – 13 Oct 2026`. */
export function periodLabel(period: Pick<Period, 'from' | 'to'>): string {
  return `${formatDateShort(period.from)} – ${formatDate(period.to)}`
}

/** The axis text of a time bucket: a day or week by its first day (`13 Oct`), a month as `Oct 26`. */
export function bucketTick(granularity: Period['granularity'], iso: string | number): string {
  const value = String(iso)
  if (granularity === 'MONTH') {
    const [year, month] = value.split('-').map(Number)
    return formatMonth(year!, month!)
  }
  return formatDateShort(value)
}

/** The tooltip heading of a time bucket: the full date, `Week of 13 Oct 2026`, or the month. */
export function bucketTitle(granularity: Period['granularity'], iso: string | number): string {
  const value = String(iso)
  if (granularity === 'MONTH') return bucketTick('MONTH', value)
  if (granularity === 'WEEK') return `Week of ${formatDate(value)}`
  return formatDate(value)
}

/** `₹2.5L` for an axis; the exact figure is always in the tooltip and the table view. */
export function compactRupees(value: number): string {
  return formatRupees(value, { compact: true })
}

/**
 * The grid a row of stat cards sits in. Four fill a desktop row, five share it, six make two rows of three,
 * so a row never ends with one lonely card.
 */
export function kpiGrid(count: number): string {
  if (count === 5) return 'grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 min-w-0'
  if (count === 6) return 'grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 min-w-0'
  if (count === 3) return 'grid gap-2.5 sm:grid-cols-3 min-w-0'
  if (count <= 2) return 'grid gap-2.5 sm:grid-cols-2 min-w-0'
  return 'grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 min-w-0'
}
