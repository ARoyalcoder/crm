import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STAGES, labelOf } from '../api'
import { STAGE_PROGRESSION } from '../lib'

/**
 * Where an application stands on the way from applied to hired. A rejected application has stopped, so no step is
 * shown as reached: which stage it was turned down at is not recorded, and guessing would be wrong.
 */
export function StageStepper({ stage }: { stage: string }) {
  const rejected = stage === 'REJECTED'
  const current = (STAGE_PROGRESSION as readonly string[]).indexOf(stage)

  return (
    <ol aria-label="Progress of this application" className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {STAGE_PROGRESSION.map((step, index) => {
        const done = !rejected && index < current
        const active = !rejected && index === current
        const finalStep = index === STAGE_PROGRESSION.length - 1
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                done && 'bg-success-soft text-success',
                active && (finalStep ? 'bg-success-soft text-success ring-1 ring-success/40' : 'bg-primary text-primary-foreground'),
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {labelOf(APPLICATION_STAGES, step)}
              {done ? <span className="sr-only">(done)</span> : null}
              {active ? <span className="sr-only">(current stage)</span> : null}
            </span>
            {finalStep ? null : <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
          </li>
        )
      })}
      {rejected ? (
        <li className="flex items-center gap-1" aria-current="step">
          <span className="ml-1 inline-flex items-center rounded-full bg-destructive-soft px-3 py-1 text-xs font-medium text-destructive">Rejected</span>
        </li>
      ) : null}
    </ol>
  )
}
