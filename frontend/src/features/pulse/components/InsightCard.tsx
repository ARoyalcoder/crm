import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toneChip } from '@/components/shared/tones'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { actionInsight, dismissInsight, pulseKeys, type InsightRow } from '@/features/pulse/api'
import { insightLook } from '@/features/pulse/insight-look'
import { entityPath } from '@/lib/entity-links'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Priority at or above this reads as urgent. The score itself (0-100) is the engine's own ranking, shown as a plain number. */
const URGENT_FROM = 80

/**
 * One insight: what was found, why it matters, what to do about it, and the record it is about. The decision to
 * act on it or let it go is one click away; "why it matters" is folded away until asked for so a list stays scannable.
 */
export function InsightCard({ insight }: { insight: InsightRow }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const look = insightLook(insight.type)
  const Icon = look.icon
  const href = entityPath(insight.entityType, insight.entityId)
  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: pulseKeys.all })
  const dismiss = useMutation({ mutationFn: () => dismissInsight(insight.id), onSuccess })
  const action = useMutation({ mutationFn: () => actionInsight(insight.id), onSuccess })
  const busy = dismiss.isPending || action.isPending
  const detailsId = `insight-${insight.id}-details`

  return (
    <Card className="gap-3 p-3 sm:p-3.5">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl', toneChip[look.tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant={look.tone}>{look.label}</Badge>
            {insight.score >= URGENT_FROM ? <Badge variant="warning">Urgent · {insight.score}</Badge> : null}
            <span className="text-xs text-muted-foreground">{formatRelative(insight.generatedAt)}</span>
          </div>
          <h3 className="text-base leading-snug font-semibold">{insight.title}</h3>
          <p className="text-sm text-muted-foreground">{insight.whatHappened}</p>
        </div>
      </div>

      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What to do</p>
        <p className="mt-0.5">{insight.whatToDo}</p>
        {insight.expectedImpact ? <p className="mt-1 text-muted-foreground">Expected impact: {insight.expectedImpact}</p> : null}
      </div>

      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          Why it matters
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
        <p id={detailsId} hidden={!open} className="mt-1.5 text-sm text-muted-foreground">
          {insight.whyItMatters}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
        <p className="min-w-0 text-sm text-muted-foreground">
          {insight.entityLabel ? (
            href ? (
              <Link to={href} className="font-medium text-primary hover:underline">
                {insight.entityType}: {insight.entityLabel}
              </Link>
            ) : (
              <span>
                {insight.entityType}: {insight.entityLabel}
              </span>
            )
          ) : null}
          {insight.whoShouldActLabel ? <span className="ml-3">For {insight.whoShouldActLabel}</span> : null}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => action.mutate()} loading={action.isPending} disabled={busy}>
            <Check aria-hidden="true" />
            Mark done
          </Button>
          <Button size="sm" variant="outline" onClick={() => dismiss.mutate()} loading={dismiss.isPending} disabled={busy}>
            <X aria-hidden="true" />
            Dismiss
          </Button>
        </div>
      </div>
      {action.isError || dismiss.isError ? (
        <p role="alert" className="text-sm text-destructive">
          That did not go through. Try again.
        </p>
      ) : null}
    </Card>
  )
}
