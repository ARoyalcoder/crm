import {
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { labelOf, ACTIVITY_TYPES } from '@/features/activities/api'

const TYPE_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  CALL: { icon: Phone, className: 'bg-info-soft text-info border-info/30' },
  MEETING: { icon: Calendar, className: 'bg-accent text-accent-foreground border-primary/30' },
  WHATSAPP: { icon: MessageSquare, className: 'bg-success-soft text-success border-success/30' },
  EMAIL: { icon: Mail, className: 'bg-info-soft text-info border-info/30' },
  SITE_VISIT: { icon: MapPin, className: 'bg-warning-soft text-warning border-warning/30' },
  FOLLOW_UP: { icon: Clock, className: 'bg-warning-soft text-warning border-warning/30' },
  NOTE: { icon: FileText, className: 'bg-muted text-foreground border-border' },
  TASK: { icon: CheckSquare, className: 'bg-accent text-accent-foreground border-primary/30' },
}

export function ActivityTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? { icon: FileText, className: 'bg-muted text-foreground' }
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${config.className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{labelOf(ACTIVITY_TYPES, type)}</span>
    </Badge>
  )
}
