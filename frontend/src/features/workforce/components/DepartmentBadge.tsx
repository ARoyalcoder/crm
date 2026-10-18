import type { WorkforceDepartment } from '../api'

const DEPT_CONFIG: Record<WorkforceDepartment, { label: string; className: string }> = {
  SALES: { label: 'Sales', className: 'bg-success-soft text-success' },
  MARKETING: { label: 'Marketing', className: 'bg-accent text-accent-foreground' },
  TECHNICAL: { label: 'Technical', className: 'bg-accent text-accent-foreground' },
  DESIGN: { label: 'Design', className: 'bg-accent text-accent-foreground' },
  MANAGEMENT: { label: 'Management', className: 'bg-warning-soft text-warning' },
  FINANCE: { label: 'Finance', className: 'bg-warning-soft text-warning' },
  HR: { label: 'HR', className: 'bg-info-soft text-info' },
  OPERATIONS: { label: 'Operations', className: 'bg-success-soft text-success' },
  OTHER: { label: 'Other', className: 'bg-muted text-muted-foreground' },
}

interface Props {
  department: WorkforceDepartment
}

export function DepartmentBadge({ department }: Props) {
  const cfg = DEPT_CONFIG[department] ?? { label: department, className: 'bg-muted text-muted-foreground' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
