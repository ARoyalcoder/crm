import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  MapPin,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/features/auth/auth-context'
import {
  formatCompactSchedule,
  formatShortLocation,
  JOB_STATUSES,
  jobsQuery,
  techniciansQuery,
  type JobFilters,
} from '@/features/field-jobs/api'
import { DelayedBadge, JobCard, JobStatusBadge } from '@/features/field-jobs/components/JobParts'
import { useListParams } from '@/lib/use-list-params'
import { cn } from '@/lib/utils'

export function FieldJobsPage() {
  const params = useListParams()
  const canManage = useHasPermission('FIELD_JOB_MANAGE')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const currentStatus = params.get('status')
  const filters: JobFilters = {
    search: params.get('search'),
    status: currentStatus,
    technicianId: params.get('technicianId'),
    page: params.page,
  }
  const jobs = useQuery(jobsQuery(filters))
  const technicians = useQuery({ ...techniciansQuery, enabled: canManage })

  // Quick stats computed from current items
  const stats = useMemo(() => {
    const items = jobs.data?.items ?? []
    const total = jobs.data?.totalItems ?? items.length
    const inProgress = items.filter((j) => ['IN_PROGRESS', 'EN_ROUTE', 'ARRIVED'].includes(j.status)).length
    const overdue = items.filter((j) => j.delayed && !['COMPLETED', 'CUSTOMER_CONFIRMED', 'CANCELLED'].includes(j.status)).length
    const completed = items.filter((j) => ['COMPLETED', 'CUSTOMER_CONFIRMED'].includes(j.status)).length

    return { total, inProgress, overdue, completed }
  }, [jobs.data])

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Field jobs"
        description="Site visits, dispatches, and real-time technician assignments."
        action={
          canManage ? (
            <Button asChild className="gap-1.5 shadow-sm">
              <Link to="/field-jobs/new">
                <Plus className="size-4" aria-hidden="true" />
                New job
              </Link>
            </Button>
          ) : null
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => params.set('status', '')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer',
            !currentStatus ? 'border-primary/50 bg-primary/5' : 'border-border/70 bg-card'
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4.5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.total}</div>
            <div className="text-xs font-medium text-muted-foreground">Total Jobs</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => params.set('status', currentStatus === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-sky-500/40 hover:shadow-xs cursor-pointer',
            currentStatus === 'IN_PROGRESS' ? 'border-sky-500/50 bg-sky-500/5' : 'border-border/70 bg-card'
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Clock className="size-4.5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.inProgress}</div>
            <div className="text-xs font-medium text-muted-foreground">In Progress</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => params.set('status', '')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-rose-500/40 hover:shadow-xs cursor-pointer',
            stats.overdue > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-border/70 bg-card'
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-4.5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.overdue}</div>
            <div className="text-xs font-medium text-muted-foreground">Attention / Overdue</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => params.set('status', currentStatus === 'COMPLETED' ? '' : 'COMPLETED')}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-emerald-500/40 hover:shadow-xs cursor-pointer',
            currentStatus === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/70 bg-card'
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4.5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">{stats.completed}</div>
            <div className="text-xs font-medium text-muted-foreground">Completed</div>
          </div>
        </button>
      </div>

      {/* Toolbar & View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListToolbar className="flex-1">
          <SearchInput label="Search jobs" value={params.get('search')} onChange={(value) => params.set('search', value)} />
          <FilterSelect
            label="Status"
            allLabel="All statuses"
            value={params.get('status')}
            onChange={(value) => params.set('status', value)}
            options={[...JOB_STATUSES]}
          />
          {canManage ? (
            <FilterSelect
              label="Technician"
              allLabel="All technicians"
              value={params.get('technicianId')}
              onChange={(value) => params.set('technicianId', value)}
              options={(technicians.data ?? []).map((person) => ({ value: person.id, label: person.name }))}
            />
          ) : null}
        </ListToolbar>

        {/* View toggle */}
        <div className="flex items-center gap-1 self-end sm:self-auto rounded-lg border border-border/80 bg-muted/40 p-1">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5"
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5"
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <List className="size-3.5" />
            <span className="hidden sm:inline">Table</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {jobs.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" aria-busy="true" />
          ))}
        </div>
      ) : jobs.isError ? (
        <ErrorState title="Could not load jobs" error={jobs.error} onRetry={() => void jobs.refetch()} />
      ) : jobs.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">No jobs match your search or filters.</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or search terms.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Sleek Grid View */
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Jobs">
          {jobs.data.items.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        /* Clean Compact Table View */
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">Job</th>
                <th className="py-2.5 px-3">Title & Customer</th>
                <th className="py-2.5 px-3">Schedule</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Technician</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {jobs.data.items.map((job) => (
                <tr key={job.id} className="transition-colors hover:bg-muted/30">
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                      {job.jobNumber}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-[260px]">
                    <div className="font-medium text-foreground truncate" title={job.title}>
                      {job.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate" title={job.customerName}>
                      {job.customerName}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{formatCompactSchedule(job.scheduledStart, job.scheduledEnd)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[180px]">
                    <div className="flex items-center gap-1.5" title={job.siteAddress}>
                      <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">{formatShortLocation(job.siteAddress)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                    {job.technicianName ? (
                      <span className="font-medium text-foreground/80">{job.technicianName}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {job.delayed && !['COMPLETED', 'CUSTOMER_CONFIRMED', 'CANCELLED'].includes(job.status) ? (
                        <DelayedBadge />
                      ) : null}
                      <JobStatusBadge status={job.status} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary gap-0.5">
                      <Link to={`/field-jobs/${job.id}`}>
                        View <ChevronRight className="size-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {jobs.data && jobs.data.items.length > 0 ? (
        <Pagination
          page={jobs.data.page}
          totalPages={jobs.data.totalPages}
          totalItems={jobs.data.totalItems}
          noun="jobs"
          singular="job"
          onPageChange={params.setPage}
        />
      ) : null}
    </div>
  )
}
