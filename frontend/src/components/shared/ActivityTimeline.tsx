import type { ReactNode } from 'react'
import { Circle, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { toneChip } from '@/components/shared/tones'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

export type ActivityItem = {
  id: string
  /** What happened, in a few words. */
  title: ReactNode
  description?: ReactNode
  /** Who did it. */
  actor?: string | null
  /** When it happened (ISO string or Date). */
  at: string | Date
  icon?: LucideIcon
  tone?: Tone
  /** Where the record can be opened. */
  href?: string
  /** A badge or tag shown after the title. */
  meta?: ReactNode
}

type ActivityTimelineProps = {
  items: ActivityItem[]
  /** Names the list for screen readers: "Recent activity". */
  label: string
  emptyTitle?: string
  emptyDescription?: ReactNode
  className?: string
}

/**
 * A short vertical feed of what happened, newest first, for dashboards and record pages. Each entry
 * has a tinted icon on a rail, a link to the record when there is one, and a time that reads
 * relatively ("2 hours ago") with the exact moment on hover and for screen readers.
 */
export function ActivityTimeline({ items, label, emptyTitle = 'Nothing has happened yet', emptyDescription, className }: ActivityTimelineProps) {
  if (items.length === 0) {
    return <EmptyState variant="compact" title={emptyTitle} description={emptyDescription} />
  }
  return (
    <ol aria-label={label} className={cn('grid', className)}>
      {items.map((item, index) => {
        const Icon = item.icon ?? Circle
        const title = item.href ? (
          <Link to={item.href} className="font-medium hover:underline">
            {item.title}
          </Link>
        ) : (
          <span className="font-medium">{item.title}</span>
        )
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < items.length - 1 ? <span aria-hidden="true" className="absolute top-9 bottom-0 left-[17px] w-px bg-border" /> : null}
            <span className={cn('relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full', toneChip[item.tone ?? 'neutral'])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5 pt-1 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {title}
                {item.meta}
              </p>
              {item.description ? <p className="line-clamp-2 text-muted-foreground">{item.description}</p> : null}
              <p className="text-xs text-muted-foreground">
                {item.actor ? `${item.actor} · ` : ''}
                <time dateTime={new Date(item.at).toISOString()} title={formatDateTime(item.at)}>
                  {formatRelative(item.at)}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
