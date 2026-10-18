import type { ReactNode } from 'react'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { toneChip } from '@/components/shared/tones'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

type WorkCardProps = {
  title: string
  /** How many there are in all (shown beside the title). */
  count?: number
  /** Where the full list lives. */
  viewAll?: { to: string; label: string }
  /** Shown instead of the list when there is nothing in it. */
  empty?: { title: string; description?: string }
  isEmpty?: boolean
  children?: ReactNode
  className?: string
}

/** A block of "my work": a heading with a count, the first few rows, and a way to the whole list. */
export function WorkCard({ title, count, viewAll, empty, isEmpty, children, className }: WorkCardProps) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 ? <Badge variant="neutral">{count}</Badge> : null}
        </CardTitle>
        {viewAll ? (
          <CardAction>
            <Link to={viewAll.to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {viewAll.label}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
        {isEmpty && empty ? <EmptyState variant="compact" title={empty.title} description={empty.description} /> : <ul className="divide-y">{children}</ul>}
      </CardContent>
    </Card>
  )
}

type WorkRowProps = {
  icon?: LucideIcon
  iconTone?: Tone
  title: ReactNode
  subtitle?: ReactNode
  /** Right-hand side: a date, an amount, a badge. */
  meta?: ReactNode
  /** One short flag under the meta ("Overdue"), always words, with its tone. */
  flag?: { label: string; icon?: LucideIcon; tone: 'danger' | 'warning' }
  href?: string
}

export function WorkRow({ icon: Icon, iconTone = 'neutral', title, subtitle, meta, flag, href }: WorkRowProps) {
  const FlagIcon = flag?.icon
  const content = (
    <>
      {Icon ? (
        <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', toneChip[iconTone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-medium">{title}</span>
        {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
      {meta || flag ? (
        <span className="grid shrink-0 justify-items-end gap-0.5 text-right text-xs text-muted-foreground">
          {meta}
          {flag ? (
            <span className={cn('inline-flex items-center gap-1 font-medium', flag.tone === 'danger' ? 'text-destructive' : 'text-warning')}>
              {FlagIcon ? <FlagIcon className="size-3.5" aria-hidden="true" /> : null}
              {flag.label}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )
  return (
    <li>
      {href ? (
        <Link to={href} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50">
          {content}
        </Link>
      ) : (
        <div className="flex items-start gap-3 px-5 py-3">{content}</div>
      )}
    </li>
  )
}
