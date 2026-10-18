import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, CalendarClock, MoreHorizontal, Pencil, Plus, UserRoundX, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable, dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { kpiGrid } from '@/features/analytics/lib'
import { useHasPermission } from '@/features/auth/auth-context'
import { daysUntil, formatDate, formatNumber, formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { JOB_STATUSES, deleteJob, jobsQuery, labelOf, recruitmentKeys, updateJob, type JobOpening } from '../api'
import { JobStatusBadge } from '../components/JobStatusBadge'
import { describePay, jobAsInput } from '../lib'

const PAGE_SIZE = 25
const CLOSING_SOON_DAYS = 14
const column = dataTableColumns<JobOpening>()

/** What a job can be moved to from where it is now. */
function statusMoves(job: JobOpening): { to: string; label: string }[] {
  switch (job.status) {
    case 'DRAFT':
      return [{ to: 'OPEN', label: 'Open for applications' }]
    case 'OPEN':
      return [
        { to: 'PAUSED', label: 'Pause' },
        { to: 'CLOSED', label: 'Close' },
      ]
    case 'PAUSED':
      return [
        { to: 'OPEN', label: 'Reopen' },
        { to: 'CLOSED', label: 'Close' },
      ]
    default:
      return [{ to: 'OPEN', label: 'Reopen' }]
  }
}

/** The openings the business is hiring for: how many are taking applications, how many people applied, and which need attention. */
export function JobsPage() {
  const params = useListParams()
  const canManage = useHasPermission('RECRUITMENT_MANAGE')
  const queryClient = useQueryClient()
  const search = params.get('search')
  const status = params.get('status')
  const filtered = Boolean(search || status)
  const jobs = useQuery(jobsQuery())
  const [deleting, setDeleting] = useState<JobOpening | null>(null)

  const refresh = () => void queryClient.invalidateQueries({ queryKey: recruitmentKeys.jobs })

  const changeStatus = useMutation({
    mutationFn: ({ job, to }: { job: JobOpening; to: string }) => updateJob(job.id, jobAsInput(job, { status: to })),
    onSuccess: (_, { job, to }) => {
      refresh()
      toast.success(`${job.title} is now ${labelOf(JOB_STATUSES, to).toLowerCase()}`)
    },
  })

  // `mutate` keeps its identity between renders, so the table's columns are not rebuilt each time.
  const moveJob = changeStatus.mutate

  const remove = useMutation({
    mutationFn: (job: JobOpening) => deleteJob(job.id),
    onSuccess: (_, job) => {
      refresh()
      setDeleting(null)
      toast.success(`${job.title} was deleted`)
    },
  })

  const all = jobs.data
  const kpis = useMemo(() => {
    const open = (all ?? []).filter((job) => job.status === 'OPEN')
    return {
      open: open.length,
      applications: (all ?? []).reduce((sum, job) => sum + (job.applicationCount ?? 0), 0),
      withoutApplicants: open.filter((job) => (job.applicationCount ?? 0) === 0).length,
      closingSoon: open.filter((job) => job.closingDate && daysUntil(job.closingDate) >= 0 && daysUntil(job.closingDate) <= CLOSING_SOON_DAYS).length,
    }
  }, [all])

  const rows = useMemo(() => {
    const needle = search.toLowerCase()
    return (all ?? []).filter(
      (job) => (!status || job.status === status) && (!needle || `${job.title} ${job.department} ${job.location ?? ''}`.toLowerCase().includes(needle)),
    )
  }, [all, search, status])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(params.page, pages - 1)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('title', {
          header: 'Job',
          cell: ({ row }) => (
            <Link to={`/recruitment/jobs/${row.original.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="font-medium">{row.original.title}</span>
              <span className="text-xs text-muted-foreground">{[row.original.department, row.original.location].filter(Boolean).join(' · ')}</span>
            </Link>
          ),
        }),
        column.accessor('minExperienceYears', { header: 'Experience', cell: ({ getValue }) => (getValue() != null ? `${getValue()}+ years` : '—') }),
        column.display({
          id: 'pay',
          header: 'Pay',
          cell: ({ row }) => describePay(row.original.minSalary, row.original.maxSalary, (value) => formatRupees(value, { compact: true })) ?? '—',
        }),
        column.accessor('applicationCount', {
          header: 'Applicants',
          cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.applicationCount ?? 0)}</span>,
        }),
        column.accessor('status', { header: 'Status', cell: ({ getValue }) => <JobStatusBadge status={getValue()} /> }),
        column.accessor('closingDate', {
          header: 'Closes',
          cell: ({ row }) => {
            const { closingDate, status: jobStatus } = row.original
            if (!closingDate) return '—'
            const late = jobStatus === 'OPEN' && daysUntil(closingDate) < 0
            return (
              <span className="grid gap-0.5">
                <span>{formatDate(closingDate)}</span>
                {late ? <span className="text-xs text-warning">Past its closing date</span> : null}
              </span>
            )
          },
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => {
            if (!canManage) return null
            const job = row.original
            return (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/recruitment/jobs/${job.id}/edit`} aria-label={`Edit ${job.title}`}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label={`More actions for ${job.title}`}>
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {statusMoves(job).map((move) => (
                      <DropdownMenuItem key={move.to} onSelect={() => moveJob({ job, to: move.to })}>
                        {move.label}
                      </DropdownMenuItem>
                    ))}
                    {(job.applicationCount ?? 0) === 0 ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(job)}>
                          Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    [canManage, moveJob],
  )

  const newJob = (
    <Button asChild>
      <Link to="/recruitment/jobs/new">
        <Plus aria-hidden="true" />
        New job
      </Link>
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader title="Job openings" description="Roles being hired for, and applicant counts." action={canManage ? newJob : null} />

      <div className={kpiGrid(4)}>
        <StatCard label="Open jobs" value={formatNumber(kpis.open)} hint={all ? `${formatNumber(all.length)} jobs in all` : undefined} icon={Briefcase} loading={jobs.isPending} />
        <StatCard label="Applications" value={formatNumber(kpis.applications)} hint="Across every job" icon={Users} loading={jobs.isPending} />
        <StatCard
          label="Open with no applicants"
          value={formatNumber(kpis.withoutApplicants)}
          hint={kpis.withoutApplicants > 0 ? 'Worth promoting' : 'Every open job has applicants'}
          icon={UserRoundX}
          tone={kpis.withoutApplicants > 0 ? 'warning' : 'neutral'}
          loading={jobs.isPending}
        />
        <StatCard
          label={`Closing in ${CLOSING_SOON_DAYS} days`}
          value={formatNumber(kpis.closingSoon)}
          hint="Open jobs nearing their closing date"
          icon={CalendarClock}
          tone={kpis.closingSoon > 0 ? 'warning' : 'neutral'}
          loading={jobs.isPending}
        />
      </div>

      <Card>
        <CardContent className="grid gap-4">
          <ListToolbar onReset={filtered ? () => params.setMany({ search: '', status: '' }) : undefined}>
            <SearchInput label="Search jobs" value={search} onChange={(value) => params.set('search', value)} />
            <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(value) => params.set('status', value)} options={[...JOB_STATUSES]} />
          </ListToolbar>
          {changeStatus.isError ? <ErrorState title="That change could not be made" error={changeStatus.error} variant="compact" /> : null}
          {jobs.isPending ? (
            <SkeletonLoader variant="table" label="Loading jobs" />
          ) : jobs.isError ? (
            <ErrorState title="Could not load the jobs" error={jobs.error} onRetry={() => void jobs.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
                caption="Job openings"
                empty={
                  <EmptyState
                    variant="compact"
                    icon={Briefcase}
                    title={filtered ? 'No job matches' : 'No jobs yet'}
                    description={filtered ? 'Try another search or clear filters.' : 'Create the first opening to start collecting applications.'}
                    action={filtered || !canManage ? undefined : newJob}
                  />
                }
              />
              <Pagination page={page} totalPages={pages} totalItems={rows.length} noun="jobs" singular="job" onPageChange={params.setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            remove.reset()
          }
        }}
        title="Delete this job?"
        description={
          <>
            {deleting ? `${deleting.title} will be removed. ` : null}This cannot be undone. A job with applicants is closed, not deleted.
            {remove.isError ? (
              <span role="alert" className="mt-2 block font-medium text-destructive">
                {remove.error.message}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Delete job"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  )
}
