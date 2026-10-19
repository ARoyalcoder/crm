import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { formatNumber, formatRupees } from '@/lib/format'
import { cn } from '@/lib/utils'
import { projectsApi, type KanbanBoard, type ProjectSummary } from '../api'
import { PriorityBadge } from './ProjectStatusBadge'

type ProjectKanbanBoardProps = {
  board: KanbanBoard
  /** The person may change a project's status (PROJECT_UPDATE). Without it the board is read-only. */
  canMove: boolean
}

/** Projects in a column per status, each with the figures that matter and, for those who may, a way to move it on. */
export function ProjectKanbanBoard({ board, canMove }: ProjectKanbanBoardProps) {
  const queryClient = useQueryClient()
  const [movingId, setMovingId] = useState<string | null>(null)

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => projectsApi.updateStatus(id, status),
    onMutate: ({ id }) => setMovingId(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onSettled: () => setMovingId(null),
  })

  return (
    <div className="grid gap-3">
      {move.isError ? <ErrorState title="That project could not be moved" error={move.error} variant="compact" /> : null}
      <div className="flex min-h-[28rem] items-start gap-4 overflow-x-auto pb-4">
        {board.columns.map(({ status, projects, totalBudget, totalRevenue }) => (
          <section
            key={status.id}
            aria-labelledby={`column-${status.id}`}
            className="flex max-h-[80vh] w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border/70 bg-muted/50 p-3 sm:w-80"
          >
            <header className="grid gap-1 border-b border-border/70 pb-2">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.color || 'var(--chart-1)' }} />
                <h2 id={`column-${status.id}`} className="min-w-0 truncate text-sm font-semibold">
                  {status.name}
                </h2>
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular text-muted-foreground">{formatNumber(projects.length)}</span>
              </div>
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>Budget {formatRupees(totalBudget, { compact: true })}</span>
                <span>Revenue {formatRupees(totalRevenue, { compact: true })}</span>
              </p>
            </header>

            <div className="grid gap-3 overflow-y-auto pr-0.5">
              {projects.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">No projects here</p>
              ) : (
                projects.map((project) => (
                  <KanbanProjectCard
                    key={project.id}
                    project={project}
                    columns={board.columns}
                    currentStatus={status.code}
                    canMove={canMove}
                    moving={movingId === project.id}
                    onMove={(next) => move.mutate({ id: project.id, status: next })}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

type KanbanProjectCardProps = {
  project: ProjectSummary
  columns: KanbanBoard['columns']
  currentStatus: string
  canMove: boolean
  moving: boolean
  onMove: (status: string) => void
}

function KanbanProjectCard({ project, columns, currentStatus, canMove, moving, onMove }: KanbanProjectCardProps) {
  return (
    <Card className={cn('gap-0 py-0', moving && 'pointer-events-none opacity-50')} aria-busy={moving || undefined}>
      <CardContent className="grid gap-2.5 p-3.5">
        <div className="flex items-start justify-end gap-2">
          <PriorityBadge priority={project.priority} />
        </div>

        <Link to={`/projects/${project.id}`} className="grid gap-0.5">
          <span className="line-clamp-2 text-sm font-semibold hover:text-primary">{project.title}</span>
          <span className="truncate text-xs text-muted-foreground">{project.customerName}</span>
        </Link>

        <div className="grid gap-1">
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular">{Math.round(project.progressPercentage)}%</span>
          </p>
          <Progress value={project.progressPercentage} label={`${project.title} progress`} className="h-1.5" />
        </div>

        <p className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{project.projectManagerName}</span>
          </span>
          <span className="shrink-0 tabular">{formatRupees(project.budget, { compact: true })}</span>
        </p>

        {canMove ? (
          <Select
            aria-label={`Move ${project.title} to another status`}
            value={currentStatus}
            onChange={(event) => onMove(event.target.value)}
            className="h-8 text-xs md:h-8"
          >
            {columns.map((column) => (
              <option key={column.status.code} value={column.status.code}>
                {column.status.name}
              </option>
            ))}
          </Select>
        ) : null}
      </CardContent>
    </Card>
  )
}
