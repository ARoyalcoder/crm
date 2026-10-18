import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Clock, Flag, GanttChart } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { projectsApi } from '../api'

/** The project's milestones and dated tasks in the order they fall, from start to target completion. */
export function ProjectTimelineTab({ projectId }: { projectId: string }) {
  const query = useQuery(projectsApi.timelineQuery(projectId))

  if (query.isPending) return <SkeletonLoader variant="list" count={4} label="Loading the timeline" />
  if (query.isError) return <ErrorState title="Could not load the timeline" error={query.error} onRetry={() => void query.refetch()} />

  const timeline = query.data
  if (timeline.items.length === 0) {
    return (
      <EmptyState
        icon={GanttChart}
        title="Nothing scheduled yet"
        description="Add dated milestones and tasks to see them here in order."
      />
    )
  }

  return (
    <section aria-labelledby="timeline-heading" className="grid gap-4">
      <div>
        <h2 id="timeline-heading" className="text-base font-semibold tracking-tight">
          Roadmap
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatDate(timeline.startDate)} to {formatDate(timeline.expectedCompletionDate)}
        </p>
      </div>

      <ol className="relative ml-3 grid gap-4 border-l-2 border-primary/25 pl-7">
        {timeline.items.map((item) => {
          const milestone = item.type === 'MILESTONE'
          const done = item.status === 'COMPLETED'
          const Icon = done ? CheckCircle2 : milestone ? Flag : Clock
          return (
            <li key={`${item.type}-${item.id}`} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-3 -left-[2.4rem] flex size-6 items-center justify-center rounded-full border-2 bg-background',
                  done ? 'border-success text-success' : milestone ? 'border-primary text-primary' : 'border-muted-foreground/60 text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="grid gap-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">{milestone ? 'Milestone' : 'Task'}</span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.dueDate ? (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {item.startDate ? `${formatDate(item.startDate)} to ` : 'Due '}
                      {formatDate(item.dueDate)}
                    </span>
                  ) : null}
                  {item.assignedToName ? <span>{item.assignedToName}</span> : null}
                  <span className="tabular">{Math.round(item.progressPercentage)}% done</span>
                </p>
                <Progress value={item.progressPercentage} label={`${item.title} progress`} tone={done ? 'success' : 'primary'} className="h-1.5" />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
