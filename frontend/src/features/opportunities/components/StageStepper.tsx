import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineDetail, PipelineStage } from '../api'

interface StageStepperProps {
  pipeline: PipelineDetail
  currentStage: PipelineStage
  status: 'OPEN' | 'WON' | 'LOST'
  lossReason?: string | null
  onSelectStage?: (stage: PipelineStage) => void
  disabled?: boolean
}

export function StageStepper({
  pipeline,
  currentStage,
  status,
  lossReason,
  onSelectStage,
  disabled = false,
}: StageStepperProps) {
  const stages = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder)
  const currentIdx = stages.findIndex((s) => s.id === currentStage.id)

  return (
    <div className="space-y-3">
      {/* Visual Stepper */}
      <div className="flex w-full flex-wrap gap-1 sm:gap-2">
        {stages.map((stage, idx) => {
          const isSelected = stage.id === currentStage.id
          const isCompleted =
            status === 'WON'
              ? true
              : status === 'OPEN' && currentIdx !== -1 && idx < currentIdx

          const isLostStage = stage.isLost
          const isWonStage = stage.isWon

          let bgClasses = 'bg-muted/60 text-muted-foreground hover:bg-muted'
          let borderClasses = 'border-border'

          if (isSelected) {
            if (status === 'WON') {
              bgClasses = 'bg-success text-white font-semibold shadow'
              borderClasses = 'border-success'
            } else if (status === 'LOST') {
              bgClasses = 'bg-destructive-solid text-white font-semibold shadow'
              borderClasses = 'border-destructive'
            } else {
              bgClasses = 'bg-primary text-primary-foreground font-semibold shadow'
              borderClasses = 'border-primary'
            }
          } else if (isCompleted) {
            bgClasses = 'bg-success-soft text-success border-success/30'
          } else if (isLostStage) {
            bgClasses = 'bg-destructive-soft/50 text-destructive/80 hover:bg-destructive-soft '
          } else if (isWonStage) {
            bgClasses = 'bg-success-soft/50 text-success/80 hover:bg-success-soft '
          }

          return (
            <button
              key={stage.id}
              type="button"
              disabled={disabled || isSelected}
              onClick={() => onSelectStage?.(stage)}
              className={cn(
                'relative flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-all',
                bgClasses,
                borderClasses,
                disabled || isSelected ? 'cursor-default' : 'cursor-pointer'
              )}
            >
              {isCompleted && !isSelected && <Check className="h-3.5 w-3.5" />}
              {isSelected && status === 'WON' && <Check className="h-3.5 w-3.5" />}
              {isSelected && status === 'LOST' && <X className="h-3.5 w-3.5" />}
              <span className="truncate">{stage.name}</span>
            </button>
          )
        })}
      </div>

      {/* Lost Reason alert if lost */}
      {status === 'LOST' && (
        <div className="rounded-md border border-destructive/30 bg-destructive-soft p-2.5 text-xs text-destructive">
          <span className="font-semibold">Opportunity Closed as Lost: </span>
          {lossReason ? lossReason : 'No reason specified'}
        </div>
      )}
    </div>
  )
}
