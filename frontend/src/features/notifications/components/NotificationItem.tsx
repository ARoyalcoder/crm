import { AlertTriangle, Bell, CheckCircle2, Info, Star, TrendingUp, XCircle, type LucideIcon } from 'lucide-react'
import { toneChip } from '@/components/shared/tones'
import { formatRelative } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '../api'

interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
}

const typeConfig: Record<NotificationType, { icon: LucideIcon; tone: Tone; label: string }> = {
  INFO: { icon: Info, tone: 'info', label: 'Info' },
  SUCCESS: { icon: CheckCircle2, tone: 'success', label: 'Success' },
  WARNING: { icon: AlertTriangle, tone: 'warning', label: 'Warning' },
  CRITICAL: { icon: XCircle, tone: 'danger', label: 'Critical' },
  ACHIEVEMENT: { icon: Star, tone: 'primary', label: 'Achievement' },
  OPPORTUNITY: { icon: TrendingUp, tone: 'success', label: 'Opportunity' },
  RISK: { icon: Bell, tone: 'warning', label: 'Risk' },
}

/** One notification row: a tinted icon for its kind, the title, a two-line message and when it arrived. */
export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = typeConfig[notification.type] ?? typeConfig.INFO
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={() => onClick?.(notification)}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/40',
        !notification.read && 'bg-accent/40',
      )}
    >
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', toneChip[config.tone])}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('truncate text-sm leading-tight', notification.read ? 'font-medium' : 'font-semibold')}>
            <span className="sr-only">{config.label}: </span>
            {notification.title}
          </span>
          <time dateTime={notification.createdAt} className="shrink-0 text-xs text-muted-foreground">
            {formatRelative(notification.createdAt)}
          </time>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.message}</span>
      </span>
      {!notification.read ? (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
          <span className="sr-only">Unread</span>
        </span>
      ) : null}
    </button>
  )
}
