import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/features/auth/auth-context'
import { activityQuery, formatDateTime, formatValue } from '@/features/audit/api'

type ActivityTimelineProps = {
  /** The entity name given in the backend's `@Audited(entity = ...)`, e.g. "Service". */
  entityType: string
  entityId: string
}

/**
 * The history of one record: who changed what and when.
 * Displays a clean, concise feed with expandable changes on demand.
 */
export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const allowed = useHasPermission('AUDIT_VIEW')
  const activity = useQuery({ ...activityQuery(entityType, entityId), enabled: allowed })

  if (!allowed) {
    return null
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Activity History</CardTitle>
        <Link
          className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          to={`/admin/audit?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`}
        >
          View in audit log
          <ExternalLink className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {activity.isPending ? (
          <Skeleton className="h-16 w-full" aria-busy="true" aria-label="Loading activity" />
        ) : activity.isError ? (
          <ErrorState title="Could not load activity" error={activity.error} onRetry={() => void activity.refetch()} />
        ) : activity.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ActivityItems items={activity.data.items} />
        )}
      </CardContent>
    </Card>
  )
}

type ActivityItem = {
  id: string
  occurredAt: string
  actorLabel: string
  message: string
  changes?: { field: string; from?: unknown; to?: unknown }[] | null
  auditLogId?: string | null
}

/** The timeline itself, clean and uncluttered with collapsible change details. */
export function ActivityItems({ items }: { items: ActivityItem[] }) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const toggle = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <ol className="grid gap-3.5" aria-label="Activity">
      {items.map((item) => {
        const isExpanded = Boolean(expandedIds[item.id])
        const hasChanges = Boolean(item.changes && item.changes.length > 0)

        return (
          <li key={item.id} className="grid gap-1 border-l-2 border-border/80 pl-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-foreground text-xs">{item.message}</p>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatDateTime(item.occurredAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{item.actorLabel}</span>
              {hasChanges && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                  >
                    {isExpanded ? (
                      <>
                        Hide changes <ChevronUp className="size-3" />
                      </>
                    ) : (
                      <>
                        {item.changes!.length} {item.changes!.length === 1 ? 'change' : 'changes'}{' '}
                        <ChevronDown className="size-3" />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {hasChanges && isExpanded && (
              <ul className="mt-1.5 grid gap-1 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                {item.changes!.map((change) => (
                  <li key={change.field} className="flex flex-wrap items-baseline gap-1">
                    <span className="font-mono font-medium text-foreground">{change.field}:</span>
                    <span className="line-through opacity-75">{formatValue(change.from)}</span>
                    <span className="text-foreground">→ {formatValue(change.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ol>
  )
}
