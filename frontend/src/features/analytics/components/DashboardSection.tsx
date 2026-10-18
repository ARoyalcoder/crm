import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardSectionProps = {
  title: string
  description?: ReactNode
  /** Links or buttons on the right of the heading. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** A titled band of a dashboard (Money, Sales, Delivery...). Headings let the page be scanned, and give each band its landmark. */
export function DashboardSection({ title, description, action, children, className }: DashboardSectionProps) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={id} className={cn('grid gap-2 min-w-0 w-full', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="grid gap-0.5">
          <h2 id={id} className="text-[13px] sm:text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
