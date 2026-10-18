import type { LeaveBalance } from '../api'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const LEAVE_CONFIG: Record<
  string,
  { label: string; bar: string; badge: string; softBg: string }
> = {
  ANNUAL: {
    label: 'Annual leave',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    softBg: 'bg-emerald-500/5',
  },
  SICK: {
    label: 'Sick leave',
    bar: 'bg-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    softBg: 'bg-rose-500/5',
  },
  CASUAL: {
    label: 'Casual leave',
    bar: 'bg-sky-500',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    softBg: 'bg-sky-500/5',
  },
  COMPENSATORY: {
    label: 'Compensatory leave',
    bar: 'bg-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    softBg: 'bg-amber-500/5',
  },
  MATERNITY: {
    label: 'Maternity leave',
    bar: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    softBg: 'bg-purple-500/5',
  },
  PATERNITY: {
    label: 'Paternity leave',
    bar: 'bg-indigo-500',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    softBg: 'bg-indigo-500/5',
  },
  UNPAID: {
    label: 'Unpaid leave',
    bar: 'bg-slate-500',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    softBg: 'bg-slate-500/5',
  },
}

interface Props {
  balance: LeaveBalance
}

export function LeaveBalanceCard({ balance }: Props) {
  const pct = balance.allocated > 0 ? Math.round((balance.used / balance.allocated) * 100) : 0
  const cfg = LEAVE_CONFIG[balance.leaveType] ?? {
    label: balance.leaveType,
    bar: 'bg-primary',
    badge: 'bg-primary/10 text-primary border-primary/20',
    softBg: 'bg-primary/5',
  }

  const isLow = balance.remaining <= 1 && balance.allocated > 0
  const isExhausted = balance.remaining === 0 && balance.allocated > 0

  return (
    <Card className="border border-border/80 dark:border-slate-800/80 bg-card overflow-hidden shadow-soft hover:shadow-pop transition-all duration-200">
      <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Year {balance.year} Allowance
            </div>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10.5px] font-semibold border',
              isExhausted
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                : isLow
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                  : cfg.badge,
            )}
          >
            {isExhausted ? 'Exhausted' : isLow ? 'Low balance' : `${balance.remaining} Available`}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Utilization: {pct}%</span>
            <span className="text-foreground font-semibold">
              {balance.used} / {balance.allocated} days
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn('h-full rounded-full transition-all duration-500', cfg.bar)}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>

        {/* Stats footer pill */}
        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/60 text-center text-xs">
          <div className="bg-slate-50 dark:bg-slate-900/50 py-1 px-1.5 rounded-lg border border-border/50">
            <div className="text-[10px] text-muted-foreground">Allocated</div>
            <div className="font-bold text-foreground">{balance.allocated}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 py-1 px-1.5 rounded-lg border border-border/50">
            <div className="text-[10px] text-muted-foreground">Used</div>
            <div className="font-bold text-amber-600 dark:text-amber-400">{balance.used}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 py-1 px-1.5 rounded-lg border border-border/50">
            <div className="text-[10px] text-muted-foreground">Remaining</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{balance.remaining}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
