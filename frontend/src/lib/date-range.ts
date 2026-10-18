import { isoDate } from '@/lib/format'

/**
 * The period every dashboard is scoped to. Both ends are calendar days, inclusive, as `YYYY-MM-DD`
 * (that is what the analytics endpoints take). Presets are named so a range survives in the URL and in bookmarks.
 */
export type DateRange = { from: string; to: string }

export type RangePresetId =
  | 'last-7-days'
  | 'last-30-days'
  | 'last-90-days'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-fy'
  | 'last-fy'

export type RangePreset = { id: RangePresetId; label: string; hint: string }

/**
 * The financial year starts on 1 April, as the backend's default configuration (`app.finance.fiscal-year-start-month`)
 * does. Change both together if the business ever moves it.
 */
const FY_START_MONTH = 4

export const RANGE_PRESETS: RangePreset[] = [
  { id: 'last-7-days', label: 'Last 7 days', hint: 'Today and the 6 days before' },
  { id: 'last-30-days', label: 'Last 30 days', hint: 'Today and the 29 days before' },
  { id: 'last-90-days', label: 'Last 90 days', hint: 'Today and the 89 days before' },
  { id: 'this-month', label: 'This month', hint: 'From the 1st to today' },
  { id: 'last-month', label: 'Last month', hint: 'The whole previous month' },
  { id: 'this-quarter', label: 'This quarter', hint: 'Calendar quarter to date' },
  { id: 'this-fy', label: 'This financial year', hint: 'From 1 April to today' },
  { id: 'last-fy', label: 'Last financial year', hint: 'The previous April to March' },
]

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
  return next
}

/** The first day of the financial year that contains `today`. */
function fiscalYearStart(today: Date): Date {
  const year = today.getMonth() + 1 >= FY_START_MONTH ? today.getFullYear() : today.getFullYear() - 1
  return new Date(year, FY_START_MONTH - 1, 1)
}

export function rangeForPreset(id: RangePresetId, now: Date = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (id) {
    case 'last-7-days':
      return { from: isoDate(addDays(today, -6)), to: isoDate(today) }
    case 'last-30-days':
      return { from: isoDate(addDays(today, -29)), to: isoDate(today) }
    case 'last-90-days':
      return { from: isoDate(addDays(today, -89)), to: isoDate(today) }
    case 'this-month':
      return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDate(today) }
    case 'last-month':
      return {
        from: isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: isoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    case 'this-quarter':
      return { from: isoDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)), to: isoDate(today) }
    case 'this-fy':
      return { from: isoDate(fiscalYearStart(today)), to: isoDate(today) }
    case 'last-fy': {
      const start = fiscalYearStart(today)
      return { from: isoDate(new Date(start.getFullYear() - 1, FY_START_MONTH - 1, 1)), to: isoDate(addDays(start, -1)) }
    }
  }
}

export function isPresetId(value: string | null | undefined): value is RangePresetId {
  return RANGE_PRESETS.some((p) => p.id === value)
}

/** The preset a range equals today, if any (so the picker can tick it and label itself). */
export function presetOf(range: DateRange, now: Date = new Date()): RangePresetId | null {
  return RANGE_PRESETS.find((p) => {
    const candidate = rangeForPreset(p.id, now)
    return candidate.from === range.from && candidate.to === range.to
  })?.id ?? null
}

/** Whole days in the range, ends included. */
export function rangeDays(range: DateRange): number {
  const [fy, fm, fd] = range.from.split('-').map(Number)
  const [ty, tm, td] = range.to.split('-').map(Number)
  const from = Date.UTC(fy!, fm! - 1, fd!)
  const to = Date.UTC(ty!, tm! - 1, td!)
  return Math.round((to - from) / 86_400_000) + 1
}

/** The period of the same length that ends the day before this one starts: what trends are compared with. */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range)
  const [fy, fm, fd] = range.from.split('-').map(Number)
  const from = new Date(fy!, fm! - 1, fd!)
  return { from: isoDate(addDays(from, -days)), to: isoDate(addDays(from, -1)) }
}

export function isValidRange(range: DateRange): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(range.from) && /^\d{4}-\d{2}-\d{2}$/.test(range.to) && range.from <= range.to
}
