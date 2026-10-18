import { Badge } from '@/components/ui/badge'
import { statusLook } from '@/lib/status'
import { cn } from '@/lib/utils'

type StatusBadgeProps = {
  className?: string
  /** Hides the leading dot (for crowded table cells). */
  plain?: boolean
} & (
  | {
      /** The status code as the API sends it: `PARTIALLY_PAID`, `IN_PROGRESS`. */
      status: string | null | undefined
      /** Scopes tone and wording to one module where a code means something different there. */
      domain?: string
      /** Replaces the generated wording. */
      label?: string
      active?: never
    }
  | {
      /** The Active / Inactive pair used by the admin lists. */
      active: boolean
      status?: never
      domain?: never
      label?: never
    }
)

/**
 * The one way to show a status. Words always, colour as a hint, so nothing depends on colour alone.
 * Prefer this over hand-picking badge colours in a feature.
 */
export function StatusBadge({ className, plain, ...rest }: StatusBadgeProps) {
  const look =
    'active' in rest && rest.active !== undefined
      ? { tone: rest.active ? ('success' as const) : ('neutral' as const), label: rest.active ? 'Active' : 'Inactive' }
      : statusLook(rest.status, rest.domain)
  const text = ('label' in rest && rest.label) || look.label

  return (
    <Badge variant={look.tone} className={cn('font-medium', className)} data-tone={look.tone}>
      {plain ? null : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
      {text}
    </Badge>
  )
}
