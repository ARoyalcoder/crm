import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { labelOf, TASK_STATUSES } from '@/features/activities/api'

export function TaskStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="outline" className="gap-1 border-success/30 bg-success-soft text-success">
          <CheckCircle2 className="h-3 w-3" />
          <span>{labelOf(TASK_STATUSES, status)}</span>
        </Badge>
      )
    case 'IN_PROGRESS':
      return (
        <Badge variant="outline" className="gap-1 border-info/30 bg-info-soft text-info">
          <PlayCircle className="h-3 w-3" />
          <span>{labelOf(TASK_STATUSES, status)}</span>
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="gap-1 border-border bg-muted/50 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          <span>{labelOf(TASK_STATUSES, status)}</span>
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1 border-muted-foreground/30 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{labelOf(TASK_STATUSES, status)}</span>
        </Badge>
      )
  }
}
