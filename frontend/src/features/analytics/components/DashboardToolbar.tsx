import type { ReactNode } from 'react'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import type { Period } from '@/features/analytics/api'
import { periodLabel } from '@/features/analytics/lib'
import type { useDateRange } from '@/lib/use-date-range'

type DashboardToolbarProps = {
  dateRange: ReturnType<typeof useDateRange>
  /** The period the server actually used; shown so nobody has to guess what "previous" means. */
  period?: Period
  /** Other filters of this dashboard, kept in the same row above the charts. */
  children?: ReactNode
}

/**
 * The one row of filters above a dashboard's charts: the date range, then anything else that scopes the whole
 * page, and a plain statement of what the figures are compared with.
 */
export function DashboardToolbar({ dateRange, period, children }: DashboardToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="search" aria-label="Dashboard filters">
      <DateRangeFilter range={dateRange.range} preset={dateRange.preset} onPreset={dateRange.setPreset} onCustom={dateRange.setCustom} />
      {children}
      {period ? (
        <p className="text-xs text-muted-foreground">
          Compared with <span className="whitespace-nowrap">{periodLabel({ from: period.previousFrom, to: period.previousTo })}</span>
        </p>
      ) : null}
    </div>
  )
}
