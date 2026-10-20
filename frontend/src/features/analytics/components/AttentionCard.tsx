import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Gauge } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Card } from '@/components/ui/card'
import { pulseFeedQuery } from '@/features/pulse/api'
import { insightLook } from '@/features/pulse/insight-look'
import { entityPath } from '@/lib/entity-links'
import { cn } from '@/lib/utils'
import { Icon3D, type Icon3DTone } from '@/components/ui/icon-3d'
import type { Tone } from '@/lib/status'

const TONE_TO_3D: Record<Tone, Icon3DTone> = {
  neutral: 'neutral',
  primary: 'primary',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  info: 'blue',
}

const SHOWN = 5

/** The few Pulse insights most worth acting on today, each leading to the record it is about. */
export function AttentionCard() {
  const feed = useQuery(pulseFeedQuery(0))
  const items = feed.data?.items.slice(0, SHOWN) ?? []

  return (
    <Card className="gap-0 p-0">
      {feed.isPending ? (
        <div className="p-3.5">
          <SkeletonLoader variant="list" count={4} label="Loading insights" />
        </div>
      ) : feed.isError ? (
        <div className="p-3">
          <ErrorState title="Could not load insights" error={feed.error} onRetry={() => void feed.refetch()} variant="compact" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Gauge}
          title="Nothing needs attention right now"
          description="Pawan Pulse reads your invoices, projects, leads and contracts. Anything needing a look appears here."
        />
      ) : (
        <ul className="divide-y">
          {items.map((insight) => {
            const look = insightLook(insight.type)
            const Icon = look.icon
            const href = entityPath(insight.entityType, insight.entityId)
            const body = (
              <>
                <Icon3D
                  icon={look.icon}
                  size="sm"
                  tone={TONE_TO_3D[look.tone] ?? 'primary'}
                  variant="solid-3d"
                  className="mt-0.5 shrink-0"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-medium">{insight.title}</span>
                    <span className="text-xs text-muted-foreground">{look.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{insight.whatToDo}</span>
                </span>
                {href ? <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
              </>
            )
            return (
              <li key={insight.id}>
                {href ? (
                  <Link to={href} className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-2.5">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {items.length > 0 ? (
        <div className="border-t px-4 py-2">
          <Link to="/pulse" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            See everything in Pulse
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </Card>
  )
}
