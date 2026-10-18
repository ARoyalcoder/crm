import { CheckCircle2, Clock, Home, AlertOctagon, Calendar, Palmtree } from 'lucide-react'
import type { AttendanceSummary } from '../api'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  summary: AttendanceSummary
}

export function AttendanceSummaryCard({ summary }: Props) {
  const totalDays =
    summary.presentDays +
    summary.workFromHomeDays +
    summary.halfDays +
    summary.leaveDays +
    summary.holidayDays +
    summary.absentDays

  const activeWorkDays = summary.presentDays + summary.workFromHomeDays + summary.halfDays * 0.5
  const attendanceRate = totalDays > 0 ? Math.round((activeWorkDays / (totalDays - summary.holidayDays || 1)) * 100) : 0
  const avgHoursPerDay = activeWorkDays > 0 ? (summary.totalWorkingHours / activeWorkDays).toFixed(1) : '0.0'

  const stats = [
    {
      label: 'Present',
      value: summary.presentDays,
      share: totalDays > 0 ? Math.round((summary.presentDays / totalDays) * 100) : 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200/80 dark:border-emerald-800/40',
      barColor: 'bg-emerald-500',
    },
    {
      label: 'WFH',
      value: summary.workFromHomeDays,
      share: totalDays > 0 ? Math.round((summary.workFromHomeDays / totalDays) * 100) : 0,
      icon: Home,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      border: 'border-violet-200/80 dark:border-violet-800/40',
      barColor: 'bg-violet-500',
    },
    {
      label: 'Half day',
      value: summary.halfDays,
      share: totalDays > 0 ? Math.round((summary.halfDays / totalDays) * 100) : 0,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200/80 dark:border-amber-800/40',
      barColor: 'bg-amber-500',
    },
    {
      label: 'Leave',
      value: summary.leaveDays,
      share: totalDays > 0 ? Math.round((summary.leaveDays / totalDays) * 100) : 0,
      icon: Palmtree,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-200/80 dark:border-orange-800/40',
      barColor: 'bg-orange-500',
    },
    {
      label: 'Holiday',
      value: summary.holidayDays,
      share: totalDays > 0 ? Math.round((summary.holidayDays / totalDays) * 100) : 0,
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200/80 dark:border-blue-800/40',
      barColor: 'bg-blue-500',
    },
    {
      label: 'Absent',
      value: summary.absentDays,
      share: totalDays > 0 ? Math.round((summary.absentDays / totalDays) * 100) : 0,
      icon: AlertOctagon,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-200/80 dark:border-rose-800/40',
      barColor: 'bg-rose-500',
    },
  ]

  return (
    <Card className="border border-border/80 dark:border-slate-800/80 bg-card overflow-hidden shadow-soft">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-border/70 dark:border-slate-800/70">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Attendance summary</span>
              <span className="text-xs font-normal text-muted-foreground">({totalDays} logged days)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attendance rate:{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {attendanceRate}%
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-border/60">
            <div>
              <span className="text-muted-foreground">Total hours: </span>
              <span className="font-bold text-foreground">{summary.totalWorkingHours.toFixed(1)}h</span>
            </div>
            <div className="w-px h-3.5 bg-border" />
            <div>
              <span className="text-muted-foreground">Daily avg: </span>
              <span className="font-bold text-primary dark:text-blue-400">{avgHoursPerDay}h/day</span>
            </div>
          </div>
        </div>

        {/* Multi-segment visual progress bar */}
        {totalDays > 0 && (
          <div className="mb-4">
            <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              {stats.map(
                (s) =>
                  s.value > 0 && (
                    <div
                      key={s.label}
                      className={cn('h-full transition-all duration-300', s.barColor)}
                      style={{ width: `${(s.value / totalDays) * 100}%` }}
                      title={`${s.label}: ${s.value} days (${s.share}%)`}
                    />
                  ),
              )}
            </div>
          </div>
        )}

        {/* 6 Metric Grid Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className={cn(
                  'flex flex-col justify-between p-2.5 rounded-xl border transition-all hover:scale-[1.02] shadow-xs',
                  s.bg,
                  s.border,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                  <Icon className={cn('size-3.5', s.color)} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className={cn('text-xl font-bold tracking-tight', s.color)}>{s.value}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{s.share}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
