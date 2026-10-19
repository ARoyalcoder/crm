import { useState } from 'react'
import { CheckCircle2, MessageSquare, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { ActivityDetail } from '@/features/activities/api'

type CompleteTaskModalProps = {
  activity: ActivityDetail
  onClose: () => void
  onComplete: (outcome: string) => Promise<void>
}

const QUICK_OUTCOMES = [
  'Customer satisfied / confirmed details',
  'Follow-up quotation requested',
  'Scheduled next meeting / call',
  'Left message / awaiting response',
  'Issue resolved successfully',
]

export function CompleteTaskModal({ activity, onClose, onComplete }: CompleteTaskModalProps) {
  const [outcome, setOutcome] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onComplete(outcome)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not complete task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-lg overflow-hidden border border-border/80 bg-card p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Mark Activity Completed</h2>
              <p className="text-xs text-muted-foreground">Log outcome and close this interaction</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Target Activity Summary Card */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Activity</span>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{activity.title}</p>
            {activity.entityName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Associated with: <span className="font-medium text-foreground">{activity.entityName}</span>
              </p>
            )}
            {activity.isRecurring && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                <span>Recurring task: completion will automatically schedule the next occurrence.</span>
              </div>
            )}
          </div>

          {/* Quick Outcome Suggestions */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Quick Outcome Templates</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_OUTCOMES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setOutcome(template)}
                  className="rounded-lg border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:bg-muted hover:text-foreground"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Notes Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Resolution / Interaction Outcome</label>
            <Textarea
              placeholder="Record final notes, client decisions, or next actions taken…"
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="resize-none text-xs"
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{submitting ? 'Completing…' : 'Confirm Completion'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
