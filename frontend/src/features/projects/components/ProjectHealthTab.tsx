import { useState } from 'react'
import { AlertCircle, AlertTriangle, CalendarClock, CheckCircle2, CheckSquare, FileCheck2, Pencil, ShieldAlert, Users, Wallet, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { toneChip, toneText } from '@/components/shared/tones'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatPercent, formatRupees } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'
import type { ProjectHealth } from '../api'
import { EditProfitabilityModal } from './EditProfitabilityModal'

type ProjectHealthTabProps = {
  projectId: string
  health?: ProjectHealth
  /** The project has milestones, tasks or deliverables to measure. Without them the score would only be a default. */
  measurable: boolean
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  return score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
}

const SEVERITY: Record<string, { tone: Tone; label: string; icon: LucideIcon }> = {
  CRITICAL: { tone: 'danger', label: 'Critical', icon: AlertCircle },
  WARNING: { tone: 'warning', label: 'Warning', icon: AlertTriangle },
  INFO: { tone: 'info', label: 'For information', icon: CheckCircle2 },
}

/** How a project is doing against its schedule, budget, tasks and sign-offs, and what it has cost so far. */
export function ProjectHealthTab({ projectId, health, measurable }: ProjectHealthTabProps) {
  const canUpdate = useHasPermission('PROJECT_UPDATE')
  const [editing, setEditing] = useState(false)

  if (!health) {
    return <EmptyState icon={ShieldAlert} title="No health figures yet" description="They appear once the project has milestones, tasks or costs." />
  }

  const { overallScore, scheduleHealth, budgetHealth, taskHealth, clientApprovalHealth, teamCapacityHealth, profitability, riskAlerts } = health
  const tone = scoreTone(overallScore)
  const costRecorded = profitability.actualCost > 0

  const components = [
    { title: 'Schedule', score: scheduleHealth, icon: CalendarClock, text: 'Progress against the expected completion date' },
    { title: 'Budget', score: budgetHealth, icon: Wallet, text: 'Recorded cost against the budget' },
    { title: 'Tasks', score: taskHealth, icon: CheckSquare, text: 'Completion, blocked and overdue tasks' },
    { title: 'Sign-off', score: clientApprovalHealth, icon: FileCheck2, text: 'Deliverables accepted against pending' },
    { title: 'Team load', score: teamCapacityHealth, icon: Users, text: 'Open tasks per team member' },
  ]

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="justify-between">
          <CardHeader>
            <CardTitle>Overall health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {measurable ? (
              <>
                <p className="flex items-baseline gap-3">
                  <span className={cn('text-4xl font-semibold tracking-tight tabular', toneText[tone])}>{Math.round(overallScore)}%</span>
                  <Badge variant={tone}>{overallScore >= 80 ? 'Healthy' : overallScore >= 60 ? 'Needs attention' : 'At risk'}</Badge>
                </p>
                <Progress value={overallScore} label="Overall project health" tone={tone} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not scored yet. Add milestones, tasks or deliverables to track health.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue and cost</CardTitle>
            {canUpdate ? (
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  Update figures
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">Revenue</dt>
                <dd className="text-lg font-semibold tabular">{formatRupees(profitability.revenue)}</dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">Cost recorded</dt>
                <dd className="text-lg font-semibold tabular">{formatRupees(profitability.actualCost)}</dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">Margin</dt>
                <dd className={cn('text-lg font-semibold tabular', costRecorded ? (profitability.grossProfit >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground')}>
                  {costRecorded ? formatRupees(profitability.grossProfit) : '—'}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">Margin %</dt>
                <dd className={cn('text-lg font-semibold tabular', costRecorded ? (profitability.grossMargin >= 15 ? 'text-success' : 'text-warning') : 'text-muted-foreground')}>
                  {costRecorded ? formatPercent(profitability.grossMargin) : '—'}
                </dd>
              </div>
            </dl>
            {!costRecorded ? <p className="text-xs text-muted-foreground">No cost recorded yet, so there is no margin.</p> : null}
            <p className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
              <span>
                Expected cost <strong className="font-medium text-foreground tabular">{formatRupees(profitability.expectedCost)}</strong>
              </span>
              <span>
                Projected final cost <strong className="font-medium text-foreground tabular">{formatRupees(profitability.projectedFinalCost)}</strong>
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {measurable ? (
        <section aria-labelledby="components-heading" className="grid gap-3">
          <h2 id="components-heading" className="text-base font-semibold tracking-tight">
            What makes up the score
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {components.map(({ title, score, icon: Icon, text }) => {
              const componentTone = scoreTone(score)
              return (
                <li key={title} className="grid gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className={cn('flex size-8 items-center justify-center rounded-lg', toneChip.primary)}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className={cn('text-lg font-semibold tabular', toneText[componentTone])}>{Math.round(score)}%</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                  <Progress value={score} label={`${title} health`} tone={componentTone} className="h-1.5" />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="risks-heading" className="grid gap-3">
        <h2 id="risks-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          Risk alerts
          <span className="text-sm font-normal text-muted-foreground">({riskAlerts.length})</span>
        </h2>
        {riskAlerts.length === 0 ? (
          <EmptyState icon={CheckCircle2} variant="compact" title="No risk alerts" description="Schedule, budget, margin, tasks and sign-offs are all within limits." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {riskAlerts.map((alert, index) => {
              const severity = SEVERITY[alert.severity?.toUpperCase()] ?? SEVERITY.INFO!
              const Icon = severity.icon
              return (
                <li key={`${alert.code}-${index}`} className={cn('flex items-start gap-3 rounded-2xl p-4', toneChip[severity.tone])}>
                  <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">{alert.title}</h3>
                      <span className="text-xs font-medium">{severity.label}</span>
                    </div>
                    <p className="text-sm">{alert.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Cost recorded so far</CardTitle>
          {canUpdate ? (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit costs
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Materials', profitability.materialCost],
              ['Labour', profitability.labourCost],
              ['Vendors and subcontract', profitability.vendorCost],
              ['Travel and logistics', profitability.travelCost],
              ['Other direct costs', profitability.otherExpenses],
            ].map(([label, value]) => (
              <div key={label as string} className="grid gap-0.5 rounded-xl bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold tabular">{formatRupees(value as number)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {editing ? <EditProfitabilityModal open onOpenChange={setEditing} projectId={projectId} profitability={profitability} /> : null}
    </div>
  )
}
