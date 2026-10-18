/**
 * One place for how numbers, money and dates read. The business is Indian: rupees with lakh / crore
 * grouping, day-month-year dates. Every screen formats through these so figures look the same everywhere.
 */

const LOCALE = 'en-IN'

const rupees = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const rupeesExact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rupeesCompact = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 })
const numbers = new Intl.NumberFormat(LOCALE)
const numbersCompact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
const dateShortFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' })
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit' })
const monthShortFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short' })
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' })
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

type MaybeNumber = number | null | undefined

/** `₹2,45,680`. A missing amount reads as an em dash, never as zero. */
export function formatRupees(value: MaybeNumber, options: { compact?: boolean; exact?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (options.compact) return rupeesCompact.format(value)
  return (options.exact ? rupeesExact : rupees).format(value)
}

/** `12,345` or, compact, `12.3K` / `1.2L` / `3.4Cr`. */
export function formatNumber(value: MaybeNumber, options: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return (options.compact ? numbersCompact : numbers).format(value)
}

/** A value that is already a percentage (`12.5` becomes `12.5%`). */
export function formatPercent(value: MaybeNumber, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Number(value.toFixed(digits)).toString()}%`
}

/** `ratio(3, 4)` is `75`; 0 when there is nothing to divide by. For funnel steps and shares. */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0
}

function toDate(value: string | Date): Date {
  // A bare date ("2026-10-13") is a calendar day, not an instant: read it in local time so it never shifts a day.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y!, m! - 1, d!)
  }
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date)
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? '—' : dateShortFormat.format(date)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormat.format(date)
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  return Number.isNaN(date.getTime()) ? '—' : timeFormat.format(date)
}

/** `Oct 26` for a month axis. */
export function formatMonth(year: number, month: number): string {
  return monthFormat.format(new Date(year, month - 1, 1))
}

export function formatMonthShort(month: number): string {
  return monthShortFormat.format(new Date(2000, month - 1, 1))
}

/** "2 days ago", "tomorrow", "in 3 hours". */
export function formatRelative(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return '—'
  const date = toDate(value)
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day')
  if (abs < 86400 * 365) return relative.format(Math.round(seconds / (86400 * 30)), 'month')
  return relative.format(Math.round(seconds / (86400 * 365)), 'year')
}

/** `IN_PROGRESS` becomes `In progress`. For codes that have no hand-written label. */
export function humanize(code: string): string {
  const text = code.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Two initials for an avatar. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?'
  )
}

/** Local calendar day as `YYYY-MM-DD` (what the API takes for date parameters). */
export function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole days from today to a `YYYY-MM-DD` date, on the local calendar; negative once the date has passed. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(year!, month! - 1, day!)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
