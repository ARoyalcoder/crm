import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Pinned to the bottom: the primary action and cancel. */
  footer?: ReactNode
  /** `sm` for a quick edit, `md` (default) for a record, `lg` for a record with tables. */
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const

/**
 * A panel that slides in from the right so the page behind it stays in view: the right place to look at
 * or edit one record without losing your place in a list. Escape closes it and focus returns to what opened it.
 */
export function Drawer({ open, onOpenChange, title, description, footer, size = 'md', children }: DrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" className={cn('gap-0 p-0', widths[size])}>
        <div className="border-b px-6 py-4 pr-14">
          <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-card px-6 py-4">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  )
}
