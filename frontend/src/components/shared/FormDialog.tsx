import type { FormEvent, ReactNode } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type FormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Label of the primary button: "Save", "Create service". */
  submitLabel: string
  /** Called on submit (button or Enter). Wire it to `form.handleSubmit(...)`. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** A save is in flight: the button spins and the dialog cannot be dismissed by accident. */
  submitting?: boolean
  /** The failed save, shown at the top of the form (field errors belong next to their fields). */
  error?: unknown
  /** The destructive variant of the primary button, for "Delete". */
  destructive?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const

/**
 * A modal form: title, fields, error summary, Cancel and a primary button with a loading state. It keeps
 * Enter-to-submit working, traps focus and refuses to close while a save is in flight.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  onSubmit,
  submitting,
  error,
  destructive,
  size = 'md',
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent className={widths[size]}>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
          {error ? <ErrorState title="That could not be saved" error={error} /> : null}
          <div className="grid gap-4">{children}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} loading={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
