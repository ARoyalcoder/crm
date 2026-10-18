import { CalendarCheck, CalendarX, Clock, Wrench, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toneChip } from '@/components/shared/tones'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, isoDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VisitView } from '../api'

const VISIT_TYPES: Record<VisitView['visitType'], { label: string; icon: LucideIcon }> = {
  SCHEDULED: { label: 'Scheduled visit', icon: Clock },
  EMERGENCY: { label: 'Emergency visit', icon: Wrench },
  INSPECTION: { label: 'Inspection', icon: CalendarCheck },
}

type ServiceVisitCardProps = {
  visit: VisitView
  /** Say which contract and customer the visit is for. The overview needs this; the contract's own page does not. */
  showContract?: boolean
  /** The person may complete or cancel visits (AMC_MANAGE). */
  canManage?: boolean
  onComplete?: (visit: VisitView) => void
  onCancel?: (visit: VisitView) => void
}

/** One service visit: what kind, when, who is going, how it went, and the buttons to close it out. */
export function ServiceVisitCard({ visit, showContract, canManage = false, onComplete, onCancel }: ServiceVisitCardProps) {
  const { label, icon: Icon } = VISIT_TYPES[visit.visitType] ?? VISIT_TYPES.SCHEDULED
  const open = visit.status === 'SCHEDULED'
  const late = open && visit.scheduledDate < isoDate(new Date())
  const done = visit.status === 'COMPLETED' && visit.completedDate

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', toneChip[late ? 'danger' : 'neutral'])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{label}</span>
              {late ? <StatusBadge status="OVERDUE" label="Overdue" /> : <StatusBadge status={visit.status} />}
            </div>
            {showContract && visit.contractNumber ? (
              <Link to={`/amc-contracts/${visit.contractId}`} className="w-fit text-sm underline-offset-2 hover:underline">
                <span className="font-mono">{visit.contractNumber}</span>
                {visit.customerName ? <span> · {visit.customerName}</span> : null}
              </Link>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {done ? `Done ${formatDate(visit.completedDate)}` : `Planned for ${formatDate(visit.scheduledDate)}`}
              {done && visit.completedDate !== visit.scheduledDate ? ` (planned ${formatDate(visit.scheduledDate)})` : ''}
              {visit.assignedEmployeeName ? ` · ${visit.assignedEmployeeName}` : ''}
            </p>
            {visit.notes ? <p className="text-sm text-muted-foreground">{visit.notes}</p> : null}
            {visit.outcome ? (
              <p className="text-sm">
                <span className="font-medium">Outcome:</span> {visit.outcome}
              </p>
            ) : null}
          </div>
        </div>

        {canManage && open ? (
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="outline" onClick={() => onComplete?.(visit)}>
              <CalendarCheck aria-hidden="true" />
              Complete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onCancel?.(visit)}>
              <CalendarX aria-hidden="true" />
              Cancel
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
