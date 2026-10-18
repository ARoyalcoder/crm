import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileText, Mail, MapPin, Pencil, Phone, UserPlus, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate, formatRupees } from '@/lib/format'
import { candidateApplicationsQuery, candidateQuery } from '../api'
import { ApplicationStageBadge } from '../components/ApplicationStageBadge'
import { AddApplicationDialog } from '../components/RecruitmentDialogs'
import { webAddress } from '../lib'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

/** One candidate: who they are, what they expect, and every job they have applied to. */
export function CandidateProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const canManage = useHasPermission('RECRUITMENT_MANAGE')
  const candidate = useQuery(candidateQuery(id))
  const applications = useQuery(candidateApplicationsQuery(id))
  const [adding, setAdding] = useState(false)

  if (candidate.isPending) return <SkeletonLoader variant="page" label="Loading the candidate" />
  if (candidate.isError) return <ErrorState title="Could not load this candidate" error={candidate.error} onRetry={() => void candidate.refetch()} />

  const person = candidate.data
  const link = webAddress(person.linkedInUrl)
  const contact = [
    { icon: Mail, text: person.email },
    person.phone ? { icon: Phone, text: person.phone } : null,
    person.location ? { icon: MapPin, text: person.location } : null,
  ].filter((item) => item !== null)

  return (
    <div className="grid gap-4">
      <PageHeader
        title={person.fullName}
        back={{ to: '/recruitment/candidates', label: 'Candidates' }}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {contact.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5" aria-hidden="true" />
                {text}
              </span>
            ))}
          </span>
        }
        action={
          canManage ? (
            <>
              <Button variant="outline" asChild>
                <Link to={`/recruitment/candidates/${id}/edit`}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
              </Button>
              <Button onClick={() => setAdding(true)}>
                <UserPlus aria-hidden="true" />
                Add to a job
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <Fact label="Experience">{person.experienceYears != null ? `${person.experienceYears} years` : 'Not stated'}</Fact>
                <Fact label="Current pay">{person.currentSalary != null ? formatRupees(person.currentSalary) : 'Not stated'}</Fact>
                <Fact label="Expected pay">{person.expectedSalary != null ? formatRupees(person.expectedSalary) : 'Not stated'}</Fact>
                <Fact label="Notice period">{person.noticePeriodDays != null ? `${person.noticePeriodDays} days` : 'Not stated'}</Fact>
                {link ? (
                  <Fact label="LinkedIn">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                      View profile
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </Fact>
                ) : null}
                {person.resumeFileName ? (
                  <Fact label="Resume on record">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate" title={person.resumeFileName}>
                        {person.resumeFileName}
                      </span>
                    </span>
                  </Fact>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          {person.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{person.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="self-start lg:col-span-2">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            {canManage && (applications.data?.length ?? 0) > 0 ? (
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                  <UserPlus aria-hidden="true" />
                  Add to a job
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {applications.isPending ? (
              <SkeletonLoader variant="list" label="Loading applications" />
            ) : applications.isError ? (
              <ErrorState title="Could not load the applications" error={applications.error} onRetry={() => void applications.refetch()} variant="compact" />
            ) : applications.data.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={Users}
                title="Not put forward for any job yet"
                description="Add this candidate to an open job to start their application."
                action={
                  canManage ? (
                    <Button onClick={() => setAdding(true)}>
                      <UserPlus aria-hidden="true" />
                      Add to a job
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y">
                {applications.data.map((application) => (
                  <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="grid min-w-0 gap-0.5">
                      <Link to={`/recruitment/applications/${application.id}`} className="truncate font-medium underline-offset-2 hover:underline">
                        {application.jobTitle ?? 'A job that is no longer listed'}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        Applied {formatDate(application.appliedDate)}
                        {application.assignedToName ? ` · looked after by ${application.assignedToName}` : ''}
                      </span>
                    </div>
                    <ApplicationStageBadge stage={application.stage} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {adding ? <AddApplicationDialog candidate={{ id, name: person.fullName }} onClose={() => setAdding(false)} /> : null}
    </div>
  )
}
