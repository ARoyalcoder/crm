import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, MoreHorizontal, Pencil, Send, UserPlus, UserRoundX, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { kpiGrid } from '@/features/analytics/lib'
import { useHasPermission } from '@/features/auth/auth-context'
import { daysUntil, formatDate, formatNumber, formatRupees } from '@/lib/format'
import { JOB_STATUSES, jobApplicationsQuery, jobQuery, labelOf, recruitmentKeys, updateJob } from '../api'
import { ApplicationPipeline } from '../components/ApplicationPipeline'
import { JobStatusBadge } from '../components/JobStatusBadge'
import { AddApplicationDialog } from '../components/RecruitmentDialogs'
import { describePay, isFinishedStage, jobAsInput } from '../lib'

/** How far away a date is, in words: "in 5 days", "today", "3 days ago". */
function distance(date: string): string {
  const days = daysUntil(date)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

/** One opening: what the role is, how much it pays, and everyone who has applied, by stage. */
export function JobDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const canManage = useHasPermission('RECRUITMENT_MANAGE')
  const queryClient = useQueryClient()
  const job = useQuery(jobQuery(id))
  const applications = useQuery(jobApplicationsQuery(id))
  const [adding, setAdding] = useState(false)

  const changeStatus = useMutation({
    mutationFn: (to: string) => updateJob(id, jobAsInput(job.data!, { status: to })),
    onSuccess: (_, to) => {
      void queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs })
      toast.success(`This job is now ${labelOf(JOB_STATUSES, to).toLowerCase()}`)
    },
  })

  if (job.isPending) return <SkeletonLoader variant="page" label="Loading the job" />
  if (job.isError) return <ErrorState title="Could not load this job" error={job.error} onRetry={() => void job.refetch()} />

  const opening = job.data
  const found = applications.data
  const finished = found?.filter((application) => isFinishedStage(application.stage)) ?? []
  const hired = found?.filter((application) => application.stage === 'HIRED').length ?? 0
  const rejected = found?.filter((application) => application.stage === 'REJECTED').length ?? 0
  const inProgress = (found?.length ?? 0) - finished.length
  const pay = describePay(opening.minSalary, opening.maxSalary, (value) => formatRupees(value))
  const moves =
    opening.status === 'OPEN'
      ? [
          { to: 'PAUSED', label: 'Pause this job' },
          { to: 'CLOSED', label: 'Close this job' },
        ]
      : opening.status === 'PAUSED'
        ? [
            { to: 'OPEN', label: 'Reopen this job' },
            { to: 'CLOSED', label: 'Close this job' },
          ]
        : [{ to: 'OPEN', label: opening.status === 'DRAFT' ? 'Open for applications' : 'Reopen this job' }]

  return (
    <div className="grid gap-4">
      <PageHeader
        title={opening.title}
        back={{ to: '/recruitment/jobs', label: 'Job openings' }}
        meta={<JobStatusBadge status={opening.status} />}
        description={[opening.department, opening.location, opening.minExperienceYears != null ? `${opening.minExperienceYears}+ years of experience` : null].filter(Boolean).join(' · ')}
        action={
          canManage ? (
            <>
              <Button variant="outline" asChild>
                <Link to={`/recruitment/jobs/${id}/edit`}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </Button>
              {opening.status === 'OPEN' ? (
                <Button onClick={() => setAdding(true)}>
                  <UserPlus aria-hidden="true" />
                  Add application
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {moves.map((move) => (
                    <DropdownMenuItem key={move.to} onSelect={() => changeStatus.mutate(move.to)}>
                      {move.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null
        }
      />

      {changeStatus.isError ? <ErrorState title="That change could not be made" error={changeStatus.error} variant="compact" /> : null}

      <div className={kpiGrid(4)}>
        <StatCard label="Applications" value={formatNumber(found?.length ?? 0)} hint="Everyone who applied" icon={Users} loading={applications.isPending} />
        <StatCard label="Being considered" value={formatNumber(inProgress)} hint="Not yet hired or rejected" icon={Send} tone="info" loading={applications.isPending} />
        <StatCard label="Hired" value={formatNumber(hired)} icon={Award} tone={hired > 0 ? 'success' : 'neutral'} loading={applications.isPending} />
        <StatCard label="Rejected" value={formatNumber(rejected)} icon={UserRoundX} loading={applications.isPending} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About the role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{opening.description}</p>
            </CardContent>
          </Card>
          {opening.requirements ? (
            <Card>
              <CardHeader>
                <CardTitle>What we are looking for</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{opening.requirements}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <Detail label="Pay">{pay ?? 'Not stated'}</Detail>
              <Detail label="Experience">{opening.minExperienceYears != null ? `${opening.minExperienceYears}+ years` : 'Not stated'}</Detail>
              <Detail label="Posted">{opening.postedDate ? formatDate(opening.postedDate) : 'Not yet'}</Detail>
              <Detail label="Closes">
                {opening.closingDate ? (
                  <>
                    {formatDate(opening.closingDate)}
                    {opening.status === 'OPEN' ? <span className="font-normal text-muted-foreground"> ({distance(opening.closingDate)})</span> : null}
                  </>
                ) : (
                  'No closing date'
                )}
              </Detail>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications by stage</CardTitle>
          {canManage && opening.status === 'OPEN' && (found?.length ?? 0) > 0 ? (
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                <UserPlus aria-hidden="true" />
                Add application
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          {applications.isPending ? (
            <SkeletonLoader variant="card" height={160} label="Loading applications" />
          ) : applications.isError ? (
            <ErrorState title="Could not load the applications" error={applications.error} onRetry={() => void applications.refetch()} variant="compact" />
          ) : found && found.length > 0 ? (
            <ApplicationPipeline applications={found} />
          ) : (
            <EmptyState
              variant="compact"
              icon={Users}
              title="No applications yet"
              description={opening.status === 'OPEN' ? 'Add the first candidate once someone applies.' : 'This job is not open for applications.'}
              action={
                canManage && opening.status === 'OPEN' ? (
                  <Button onClick={() => setAdding(true)}>
                    <UserPlus aria-hidden="true" />
                    Add application
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      {adding ? <AddApplicationDialog job={{ id, title: opening.title }} onClose={() => setAdding(false)} /> : null}
    </div>
  )
}
