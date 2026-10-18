import { Badge } from '@/components/ui/badge'
import { labelOf, TASK_PRIORITIES } from '@/features/activities/api'

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const variant = (() => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'default'
      default:
        return 'secondary'
    }
  })()

  const customClass = (() => {
    switch (priority) {
      case 'HIGH':
        return 'bg-warning hover:bg-warning/90 text-white border-transparent'
      case 'MEDIUM':
        return 'bg-warning-soft text-warning border-warning/30'
      case 'LOW':
        return 'bg-muted text-muted-foreground'
      default:
        return ''
    }
  })()

  return (
    <Badge variant={variant} className={`text-xs ${customClass}`}>
      {labelOf(TASK_PRIORITIES, priority)}
    </Badge>
  )
}
