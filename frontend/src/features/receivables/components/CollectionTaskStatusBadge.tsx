import { cn } from '@/lib/utils'
import { taskStatusLabel } from '@/features/receivables/api'

const BADGE = 'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-primary/30 bg-accent text-accent-foreground',
  IN_PROGRESS: 'border-warning/30 bg-warning-soft text-warning',
  COMPLETED: 'border-success/30 bg-success-soft text-success',
  CANCELLED: 'bg-muted text-muted-foreground',
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'border-border bg-muted/50 text-muted-foreground',
  MEDIUM: 'border-info/30 bg-info-soft text-info',
  HIGH: 'border-warning/30 bg-warning-soft text-warning',
  CRITICAL: 'border-destructive/30 bg-destructive-soft text-destructive',
}

/** Status badge for a collection task. */
export function CollectionTaskStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(BADGE, STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground')}>
      <span className="sr-only">Status: </span>
      {taskStatusLabel(status)}
    </span>
  )
}

/** Priority badge for a collection task. */
export function CollectionTaskPriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn(BADGE, PRIORITY_STYLES[priority] ?? 'bg-muted text-muted-foreground')}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  )
}
