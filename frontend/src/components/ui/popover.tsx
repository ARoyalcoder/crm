import type { ComponentProps, ReactElement } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close

type PopoverTriggerProps = ComponentProps<typeof PopoverPrimitive.Trigger> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: ReactElement<any>
}

function PopoverTrigger({ render, asChild, children, ...props }: PopoverTriggerProps) {
  if (render) {
    return (
      <PopoverPrimitive.Trigger asChild {...props}>
        {render}
      </PopoverPrimitive.Trigger>
    )
  }
  return (
    <PopoverPrimitive.Trigger asChild={asChild} {...props}>
      {children}
    </PopoverPrimitive.Trigger>
  )
}

type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content> & {
  finalFocus?: unknown
}

/** A floating panel anchored to its trigger. Closes on Escape and outside click; focus returns to the trigger. */
function PopoverContent({ className, align = 'end', sideOffset = 8, finalFocus: _finalFocus, ...props }: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-popover=""
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/70 bg-popover p-0 text-popover-foreground shadow-pop outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverTrigger }
