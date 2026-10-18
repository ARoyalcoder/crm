import type { EmploymentStatus } from '../api'

const STATUS_CONFIG: Record<
  EmploymentStatus,
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Active', className: 'bg-success-soft text-success' },
  ON_LEAVE: { label: 'On leave', className: 'bg-warning-soft text-warning' },
  RESIGNED: { label: 'Resigned', className: 'bg-muted text-muted-foreground' },
  TERMINATED: { label: 'Terminated', className: 'bg-destructive-soft text-destructive' },
  PROBATION: { label: 'Probation', className: 'bg-info-soft text-info' },
}

interface Props {
  status: EmploymentStatus
}

export function EmployeeStatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
