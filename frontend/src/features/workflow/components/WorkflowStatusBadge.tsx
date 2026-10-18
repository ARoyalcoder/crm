import { cn } from '@/lib/utils'
import { workflowStatusLabel } from '@/features/workflow/api'

const BADGE = 'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'border-border bg-muted/50 text-muted-foreground',
  ACTIVE: 'border-success/30 bg-success-soft text-success',
  INACTIVE: 'bg-muted text-muted-foreground',
}

/** Status badge for a workflow rule. */
export function WorkflowStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(BADGE, STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground')}>
      <span className="sr-only">Status: </span>
      {workflowStatusLabel(status)}
    </span>
  )
}
