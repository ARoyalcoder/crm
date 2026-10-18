import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateShort } from '@/lib/format'
import { APPLICATION_STAGES, labelOf, type Application } from '../api'
import { ApplicationStageBadge } from './ApplicationStageBadge'

/** The stages an application passes through while it is still being considered. */
const ACTIVE_STAGES = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED']

function ApplicationCard({ application }: { application: Application }) {
  return (
    <Link
      to={`/recruitment/applications/${application.id}`}
      className="grid gap-1 rounded-xl border bg-card p-3 text-sm shadow-soft transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <span className="truncate font-medium">{application.candidateName ?? 'Unknown candidate'}</span>
      <span className="text-xs text-muted-foreground">Applied {formatDateShort(application.appliedDate)}</span>
      {application.assignedToName ? (
        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <UserRound className="size-3 shrink-0" aria-hidden="true" />
          {application.assignedToName}
        </span>
      ) : null}
    </Link>
  )
}

function Lane({ stage, applications }: { stage: string; applications: Application[] }) {
  return (
    <section aria-label={`${labelOf(APPLICATION_STAGES, stage)}: ${applications.length}`} className="grid content-start gap-2 rounded-2xl border bg-muted/30 p-3">
      <header className="flex items-center justify-between gap-2">
        <ApplicationStageBadge stage={stage} />
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{applications.length}</span>
      </header>
      {applications.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">No one at this stage</p>
      ) : (
        <ul className="grid gap-2">
          {applications.map((application) => (
            <li key={application.id}>
              <ApplicationCard application={application} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Applications for one job, laid out in a column for each stage they can be at. Hired and rejected sit below. */
export function ApplicationPipeline({ applications }: { applications: Application[] }) {
  const at = (stage: string) => applications.filter((application) => application.stage === stage)
  const hired = at('HIRED')
  const rejected = at('REJECTED')

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ACTIVE_STAGES.map((stage) => (
          <Lane key={stage} stage={stage} applications={at(stage)} />
        ))}
      </div>
      {hired.length > 0 || rejected.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {hired.length > 0 ? <Lane stage="HIRED" applications={hired} /> : null}
          {rejected.length > 0 ? <Lane stage="REJECTED" applications={rejected} /> : null}
        </div>
      ) : null}
    </div>
  )
}
