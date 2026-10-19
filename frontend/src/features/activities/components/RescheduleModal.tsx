import { useState } from 'react'
import { Calendar, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ActivityDetail } from '@/features/activities/api'

type RescheduleModalProps = {
  activity: ActivityDetail
  onClose: () => void
  onReschedule: (dueDate: string, reminderAt?: string | null) => Promise<void>
}

export function RescheduleModal({ activity, onClose, onReschedule }: RescheduleModalProps) {
  const [dueDate, setDueDate] = useState(activity.dueDate ? activity.dueDate.slice(0, 16) : '')
  const [reminderAt, setReminderAt] = useState(activity.reminderAt ? activity.reminderAt.slice(0, 16) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function quickAddDays(days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(10, 0, 0, 0)
    setDueDate(d.toISOString().slice(0, 16))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dueDate) {
      setError('Please choose a valid date & time')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onReschedule(
        new Date(dueDate).toISOString(),
        reminderAt ? new Date(reminderAt).toISOString() : null
      )
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reschedule activity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-md overflow-hidden border border-border/80 bg-card p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary">
              <Calendar className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Reschedule Activity</h2>
              <p className="text-xs text-muted-foreground">Adjust target deadline and reminder alerts</p>
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
            {activity.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Currently set for: <span className="font-medium text-foreground">{new Date(activity.dueDate).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Quick Date Presets */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Quick Presets</span>
            <div className="mt-1.5 flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => quickAddDays(1)} className="flex-1 text-xs">
                Tomorrow
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => quickAddDays(3)} className="flex-1 text-xs">
                In 3 Days
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => quickAddDays(7)} className="flex-1 text-xs">
                Next Week
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">New Due Date & Time *</label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Reminder Notification (Optional)</label>
            <Input
              type="datetime-local"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              className="text-xs"
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting} className="gap-1.5">
              <Clock className="size-3.5" />
              <span>{submitting ? 'Updating…' : 'Save New Date'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
