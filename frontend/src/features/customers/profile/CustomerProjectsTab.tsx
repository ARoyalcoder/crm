import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { RecordSection } from '@/features/customers/profile/RecordSection'
import type { CustomerTabProps } from '@/features/customers/profile/tabs'
import { projectsApi } from '@/features/projects/api'
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal'
import { PriorityBadge, ProjectStatusBadge } from '@/features/projects/components/ProjectStatusBadge'
import { Progress } from '@/components/ui/progress'
import { formatDate, formatRupees } from '@/lib/format'

/** The customer's projects: where each stands, who runs it, and a way to start another. */
export function CustomerProjectsTab({ customer }: CustomerTabProps) {
  const canView = useHasPermission('PROJECT_VIEW')
  const canCreate = useHasPermission('PROJECT_CREATE')
  const [creating, setCreating] = useState(false)
  const projects = useQuery({ ...projectsApi.listQuery({ customerId: customer.id, size: 50 }), enabled: canView })

  return (
    <>
      <RecordSection
        title="Projects"
        permission="PROJECT_VIEW"
        noun="projects"
        query={projects}
        empty="No project yet. Start one here, or convert an accepted quotation into an order."
        action={
          canCreate ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              New project
            </Button>
          ) : undefined
        }
        row={(project) => (
          <>
            <Link to={`/projects/${project.id}`} className="grid min-w-0 gap-0.5 underline-offset-2 hover:underline">
              <span className="text-sm font-medium">{project.title}</span>
              <span className="text-xs text-muted-foreground">
                {project.projectManagerName} · due {formatDate(project.expectedCompletionDate)}
              </span>
            </Link>
            <span className="flex flex-wrap items-center gap-3">
              <Progress value={project.progressPercentage} label={`${project.title} progress`} className="w-20" />
              <PriorityBadge priority={project.priority} />
              <ProjectStatusBadge status={project.status} />
              <span className="text-sm font-medium tabular">{formatRupees(project.budget)}</span>
            </span>
          </>
        )}
      />
      {creating ? <CreateProjectModal open onOpenChange={setCreating} initialCustomerId={customer.id} initialCustomerName={customer.displayName} /> : null}
    </>
  )
}
