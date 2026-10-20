import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Icon3D } from '@/components/ui/icon-3d'

type EmptyStateProps = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  /** Usually a "Create ..." button. Only pass one the user is allowed to use. */
  action?: ReactNode
  /** `compact` drops the dashed frame so it can sit inside a card or a chart. */
  variant?: 'framed' | 'compact'
  className?: string
}

/**
 * Shown when a list, chart or section has nothing in it (as opposed to a failed load). Say what is
 * missing and, when the user can do something about it, offer that action.
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action, variant = 'framed', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 px-4 text-center',
        variant === 'framed' ? 'rounded-xl border border-dashed bg-card/50 py-8' : 'py-5',
        className,
      )}
    >
      <Icon3D
        icon={Icon}
        size="lg"
        tone="blue"
        variant="floating-3d"
        float
        className="mb-1"
      />
      <p className="text-[13px] font-semibold">{title}</p>
      {description ? <div className="max-w-sm text-xs text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
