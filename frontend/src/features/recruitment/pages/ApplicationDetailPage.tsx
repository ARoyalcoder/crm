import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, CalendarPlus, ChevronRight, MoreHorizontal, Star, UserRoundX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate, formatDateTime, formatRupees } from '@/lib/format'
import { APPLICATION_STAGES, INTERVIEW_TYPES, applicationQuery, cancelInterview, hireApplication, labelOf, type Interview } from '../api'
import { ApplicationStageBadge } from '../components/ApplicationStageBadge'
import { AdvanceStageDialog, CompleteInterviewDialog, RejectApplicationDialog, ScheduleInterviewDialog } from '../components/RecruitmentDialogs'
import { StageStepper } from '../components/StageStepper'
import { isFinishedStage, nextStage } from '../lib'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star key={step} className={step <= value ? 'size-3.5 fill-warning text-warning' : 'size-3.5 text-muted-foreground/40'} aria-hidden="true" />
      ))}
    </span>
  )
}

/** One person's application for one job: where it stands, what to do next, and the interviews held for it. */
export function ApplicationDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const canManage = useHasPermission('RECRUITMENT_MANAGE')
  const queryClient = useQueryClient()
  const detail = useQuery(applicationQuery(id))

  const [advancingTo, setAdvancingTo] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [hiring, setHiring] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [rescheduling, setRescheduling] = useState<Interview | null>(null)
  const [completing, setCompleting] = useState<Interview | null>(null)
  const [cancelling, setCancelling] = useState<Interview | null>(null)
  // When the page was opened: an interview before then that nobody has written up is waiting on feedback.
  const [openedAt] = useState(() => Date.now())

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['recruitment'] })

  const hire = useMutation({
    mutationFn: () => hireApplication(id),
    onSuccess: () => {
      refresh()
      setHiring(false)
      toast.success('Marked as hired')
    },
  })

  const cancel = useMutation({
    mutationFn: (interview: Interview) => cancelInterview(interview.id),
    onSuccess: () => {
      refresh()
      setCancelling(null)
      toast.success('Interview cancelled')
    },
  })

  if (detail.isPending) return <SkeletonLoader variant="page" label="Loading the application" />
  if (detail.isError) return <ErrorState title="Could not load this application" error={detail.error} onRetry={() => void detail.refetch()} />

  const { application, candidate, job, interviews } = detail.data
  const finished = isFinishedStage(application.stage)
  const next = nextStage(application.stage)
  const canAct = canManage && !finished

  return (
    <div className="grid gap-4">
      <PageHeader
        title={candidate.fullName}
        back={{ to: `/recruitment/jobs/${job.id}`, label: job.title }}
        meta={<ApplicationStageBadge stage={application.stage} />}
        description={`Applied for ${job.title} on ${formatDate(application.appliedDate)}.`}
        action={
          canAct ? (
            <>
              {application.stage === 'SELECTED' ? (
                <Button onClick={() => setHiring(true)}>
                  <Award aria-hidden="true" />
                  Hire {candidate.firstName}
                </Button>
              ) : next ? (
                <Button onClick={() => setAdvancingTo(next)}>
                  Move to {labelOf(APPLICATION_STAGES, next)}
                  <ChevronRight aria-hidden="true" />
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setRejecting(true)}>
                <UserRoundX aria-hidden="true" />
                Reject
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <StageStepper stage={application.stage} />
              {application.stageNotes ? (
                <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                  <span className="font-medium">Note on this stage: </span>
                  {application.stageNotes}
                </p>
              ) : null}
              {application.stage === 'REJECTED' ? (
                <p role="status" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
                  <span className="font-medium">Rejected. </span>
                  {application.rejectionReason ?? 'No reason was recorded.'}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interviews</CardTitle>
              {canAct ? (
                <CardAction>
                  <Button variant="outline" size="sm" onClick={() => setScheduling(true)}>
                    <CalendarPlus aria-hidden="true" />
                    Schedule interview
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={CalendarPlus}
                  title="No interviews yet"
                  description={canAct ? 'Schedule one to add it to the interviewer\'s calendar and keep feedback with the application.' : undefined}
                  action={
                    canAct ? (
                      <Button onClick={() => setScheduling(true)}>
                        <CalendarPlus aria-hidden="true" />
                        Schedule interview
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="divide-y">
                  {interviews.map((interview) => {
                    const awaitingFeedback = !interview.completed && new Date(interview.scheduledAt).getTime() < openedAt
                    return (
                      <li key={interview.id} className="grid gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-0.5">
                            <p className="font-medium">{labelOf(INTERVIEW_TYPES, interview.interviewType)} interview</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(interview.scheduledAt)}
                              {interview.durationMinutes ? ` · ${interview.durationMinutes} minutes` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              With {interview.interviewerName ?? 'someone no longer listed'}
                              {interview.location ? ` · ${interview.location}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {interview.completed ? (
                              <StatusBadge status="COMPLETED" label="Done" />
                            ) : awaitingFeedback ? (
                              <StatusBadge status="PENDING" label="Awaiting feedback" />
                            ) : (
                              <StatusBadge status="SCHEDULED" label="Scheduled" />
                            )}
                            {canManage && !interview.completed ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label={`Actions for the ${labelOf(INTERVIEW_TYPES, interview.interviewType).toLowerCase()} interview`}>
                                    <MoreHorizontal aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setCompleting(interview)}>Mark as done</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setRescheduling(interview)}>Reschedule</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => setCancelling(interview)}>
                                    Cancel interview
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </div>
                        {interview.completed && (interview.feedback || interview.rating != null) ? (
                          <div className="grid gap-1.5 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                            {interview.rating != null ? <Rating value={interview.rating} /> : null}
                            {interview.feedback ? <p className="whitespace-pre-line">{interview.feedback}</p> : null}
                          </div>
                        ) : interview.notes ? (
                          <p className="text-sm text-muted-foreground">{interview.notes}</p>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <Fact label="Name">
                  <Link to={`/recruitment/candidates/${candidate.id}`} className="text-primary underline-offset-2 hover:underline">
                    {candidate.fullName}
                  </Link>
                </Fact>
                <Fact label="Email">{candidate.email}</Fact>
                {candidate.phone ? <Fact label="Phone">{candidate.phone}</Fact> : null}
                <Fact label="Experience">{candidate.experienceYears != null ? `${candidate.experienceYears} years` : 'Not stated'}</Fact>
                <Fact label="Expected pay">{candidate.expectedSalary != null ? formatRupees(candidate.expectedSalary) : 'Not stated'}</Fact>
                <Fact label="Notice period">{candidate.noticePeriodDays != null ? `${candidate.noticePeriodDays} days` : 'Not stated'}</Fact>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <Fact label="Job">
                  <Link to={`/recruitment/jobs/${job.id}`} className="text-primary underline-offset-2 hover:underline">
                    {job.title}
                  </Link>
                </Fact>
                <Fact label="Applied on">{formatDate(application.appliedDate)}</Fact>
                <Fact label="Looked after by">{application.assignedToName ?? 'No one yet'}</Fact>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {advancingTo ? <AdvanceStageDialog applicationId={id} candidateName={candidate.fullName} to={advancingTo} onClose={() => setAdvancingTo(null)} /> : null}
      {rejecting ? <RejectApplicationDialog applicationId={id} candidateName={candidate.fullName} onClose={() => setRejecting(false)} /> : null}
      {scheduling ? <ScheduleInterviewDialog applicationId={id} candidateName={candidate.fullName} onClose={() => setScheduling(false)} /> : null}
      {rescheduling ? <ScheduleInterviewDialog applicationId={id} candidateName={candidate.fullName} interview={rescheduling} onClose={() => setRescheduling(null)} /> : null}
      {completing ? <CompleteInterviewDialog interview={completing} candidateName={candidate.fullName} onClose={() => setCompleting(null)} /> : null}

      <ConfirmationDialog
        open={hiring}
        onOpenChange={(open) => {
          if (!open) {
            setHiring(false)
            hire.reset()
          }
        }}
        title={`Hire ${candidate.fullName}?`}
        description={
          <>
            This records {candidate.fullName} as hired for {job.title}. It cannot be undone.
            {hire.isError ? (
              <span role="alert" className="mt-2 block font-medium text-destructive">
                {hire.error.message}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Hire"
        pending={hire.isPending}
        onConfirm={() => hire.mutate()}
      />
      <ConfirmationDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelling(null)
            cancel.reset()
          }
        }}
        title="Cancel this interview?"
        description={
          <>
            {cancelling ? `The ${labelOf(INTERVIEW_TYPES, cancelling.interviewType).toLowerCase()} interview on ${formatDateTime(cancelling.scheduledAt)} will be removed.` : null}
            {cancel.isError ? (
              <span role="alert" className="mt-2 block font-medium text-destructive">
                {cancel.error.message}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Cancel interview"
        destructive
        pending={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling)}
      />
    </div>
  )
}
