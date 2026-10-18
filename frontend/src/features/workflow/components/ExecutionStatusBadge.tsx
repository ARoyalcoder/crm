import { cn } from '@/lib/utils'
import { executionStatusLabel } from '@/features/workflow/api'

const BADGE = 'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const STATUS_STYLES: Record<string, string> = {
  TRIGGERED: 'border-info/30 bg-info-soft text-info',
  CONDITION_MET: 'border-primary/30 bg-accent text-accent-foreground',
  CONDITION_NOT_MET: 'border-border bg-muted/50 text-muted-foreground',
  ACTION_EXECUTED: 'border-success/30 bg-success-soft text-success',
  ACTION_FAILED: 'border-destructive/30 bg-destructive-soft text-destructive',
}

/** Status badge for a workflow execution log entry. */
export function ExecutionStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(BADGE, STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground')}>
      <span className="sr-only">Execution status: </span>
      {executionStatusLabel(status)}
    </span>
  )
}
