import type { ComponentProps } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-foreground/45 backdrop-blur-[2px]', className)} {...props} />
}

/**
 * Centered modal. Pass `side` to turn it into a drawer that slides in from the left or right edge.
 * Focus is trapped inside while open, Escape closes it, and focus returns to what opened it.
 */
function DialogContent({
  className,
  children,
  side,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'left' | 'right'; hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-drawer={side}
        className={cn(
          'fixed z-50 flex flex-col gap-4 border border-border/70 bg-card text-card-foreground shadow-pop outline-none',
          side === 'left' && 'inset-y-0 left-0 h-full w-72 max-w-[85vw] border-y-0 border-l-0 p-0',
          side === 'right' && 'inset-y-0 right-0 h-full w-full max-w-md overflow-y-auto border-y-0 border-r-0 p-6',
          !side && 'top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-4 sm:p-6',
          className,
        )}
        {...props}
      >
        {children}
        {side !== 'left' && !hideClose ? (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 pr-8', className)} {...props} />
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
