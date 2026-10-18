import { useState } from 'react'
import { Clock, Filter, Sparkles } from 'lucide-react'
import type { AttendanceRecord, AttendanceType } from '../api'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<
  AttendanceType,
  { label: string; full: string; badgeClass: string; bgSoft: string; border: string }
> = {
  PRESENT: {
    label: 'P',
    full: 'Present',
    badgeClass: 'bg-emerald-600 text-white dark:bg-emerald-500',
    bgSoft: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/40',
  },
  WORK_FROM_HOME: {
    label: 'W',
    full: 'Work from home',
    badgeClass: 'bg-violet-600 text-white dark:bg-violet-500',
    bgSoft: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800/40',
  },
  HALF_DAY: {
    label: 'H',
    full: 'Half day',
    badgeClass: 'bg-amber-500 text-white dark:bg-amber-500',
    bgSoft: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/40',
  },
  LEAVE: {
    label: 'L',
    full: 'Leave',
    badgeClass: 'bg-orange-500 text-white dark:bg-orange-500',
    bgSoft: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800/40',
  },
  HOLIDAY: {
    label: 'HO',
    full: 'Holiday',
    badgeClass: 'bg-blue-600 text-white dark:bg-blue-500',
    bgSoft: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/40',
  },
  ABSENT: {
    label: 'A',
    full: 'Absent',
    badgeClass: 'bg-rose-600 text-white dark:bg-rose-500',
    bgSoft: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/40',
  },
}

interface Props {
  year: number
  month: number // 1-based
  records: AttendanceRecord[]
  onSelectDay?: (dateStr: string, record?: AttendanceRecord) => void
}

export function AttendanceCalendar({ year, month, records, onSelectDay }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<AttendanceType | null>(null)

  const byDate = new Map(records.map((r) => [r.attendanceDate, r]))

  // Counts by status
  const counts = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {} as Record<AttendanceType, number>)

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startDow = firstDay.getDay() // 0=Sun

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(startDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const todayDay = isCurrentMonth ? now.getDate() : null

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-border/80 dark:border-slate-800/80 bg-card overflow-hidden shadow-soft transition-all">
        {/* Interactive Filterable Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="size-3" />
              Filter:
            </span>
            {(Object.keys(TYPE_CONFIG) as AttendanceType[]).map((t) => {
              const cfg = TYPE_CONFIG[t]
              const count = counts[t] || 0
              const isActive = selectedFilter === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedFilter(isActive ? null : t)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card dark:bg-slate-800/80 border-border/70 dark:border-slate-700/60 text-foreground hover:bg-muted/80',
                  )}
                  title={`Click to ${isActive ? 'clear' : 'filter by'} ${cfg.full}`}
                >
                  <span className={cn('size-2 rounded-full', cfg.badgeClass)} />
                  <span>{cfg.full}</span>
                  <span className={cn('text-[10px] font-semibold opacity-75 ml-0.5 px-1 py-0.2 rounded', isActive ? 'bg-black/20' : 'bg-muted')}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedFilter && (
            <button
              type="button"
              onClick={() => setSelectedFilter(null)}
              className="text-[11px] font-semibold text-primary dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-border/60 dark:border-slate-800/70 bg-muted/40 dark:bg-slate-900/40 text-center text-xs font-semibold text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} className={cn('py-2', (i === 0 || i === 6) && 'text-amber-600 dark:text-amber-500/80 font-medium')}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-border/50 dark:divide-slate-800/60 border-b border-border/50 dark:border-slate-800/60 last:border-b-0">
            {w.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[58px] sm:min-h-[64px] bg-muted/15 dark:bg-slate-950/30" />
              }

              const dateStr = `${year}-${pad(month)}-${pad(day)}`
              const record = byDate.get(dateStr)
              const isWeekend = di === 0 || di === 6
              const isToday = day === todayDay

              const matchesFilter = !selectedFilter || (record && record.type === selectedFilter)
              const cfg = record ? TYPE_CONFIG[record.type] : null

              const cellContent = (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDay?.(dateStr, record)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectDay?.(dateStr, record)
                    }
                  }}
                  className={cn(
                    'relative flex min-h-[58px] sm:min-h-[64px] flex-col items-center justify-between p-1.5 text-xs transition-all duration-150 cursor-pointer select-none',
                    isWeekend && 'bg-slate-50/60 dark:bg-slate-900/20',
                    !matchesFilter && 'opacity-25 grayscale-[30%]',
                    matchesFilter && record && 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40',
                    isToday && 'bg-primary/5 dark:bg-blue-950/20',
                  )}
                >
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-5 sm:size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                        isToday
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                          : isWeekend
                            ? 'text-muted-foreground/80'
                            : 'text-foreground',
                      )}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="hidden sm:inline-block text-[9px] uppercase tracking-wider font-bold text-primary dark:text-blue-400">
                        Today
                      </span>
                    )}
                  </div>

                  {record && cfg ? (
                    <div className="w-full mt-1 flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-full max-w-[85%] py-0.5 px-1 rounded text-[10px] sm:text-[11px] font-bold tracking-tight shadow-xs transition-transform hover:scale-105',
                          cfg.badgeClass,
                        )}
                      >
                        {cfg.label}
                        {record.workingHours ? (
                          <span className="hidden sm:inline-block ml-1 opacity-90 font-normal text-[9px]">
                            {record.workingHours}h
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
              )

              if (record && cfg) {
                const formattedDateText = new Date(year, month - 1, day).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <Tooltip key={di}>
                    <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
                    <TooltipContent side="top" className="p-2.5 max-w-[220px] text-xs">
                      <div className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1.5 flex items-center justify-between">
                        <span>{formattedDateText}</span>
                        <span className={cn('size-2 rounded-full', cfg.badgeClass)} />
                      </div>
                      <div className="grid gap-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-semibold text-foreground">{cfg.full}</span>
                        </div>
                        {record.checkIn && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Punch in:</span>
                            <span className="font-mono">{record.checkIn}</span>
                          </div>
                        )}
                        {record.checkOut && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Punch out:</span>
                            <span className="font-mono">{record.checkOut}</span>
                          </div>
                        )}
                        {record.workingHours && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hours logged:</span>
                            <span className="font-semibold text-foreground">{record.workingHours.toFixed(1)} hrs</span>
                          </div>
                        )}
                        {record.leaveType && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Leave type:</span>
                            <span className="font-medium">{record.leaveType}</span>
                          </div>
                        )}
                        {record.notes && (
                          <div className="mt-1 border-t border-border/40 pt-1 text-muted-foreground italic">
                            &ldquo;{record.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={di}>{cellContent}</div>
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
