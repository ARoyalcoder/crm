import * as React from "react"
import { cn } from "cn"
import { Tooltip as TooltipPrimitive } from "radix-ui"

function TooltipProvider({
  delayDuration = 0,
  delay,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & {
  delay?: number
}) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delay ?? delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  label,
  side = "top",
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root> & {
  label?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}) {
  if (label !== undefined) {
    return (
      <TooltipPrimitive.Root {...props}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </TooltipPrimitive.Root>
    )
  }
  return <TooltipPrimitive.Root data-slot="tooltip" {...props}>{children}</TooltipPrimitive.Root>
}

function TooltipTrigger({
  render,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
  render?: React.ReactNode
}) {
  if (render) {
    return (
      <TooltipPrimitive.Trigger asChild {...props}>
        {render}
      </TooltipPrimitive.Trigger>
    )
  }
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>{children}</TooltipPrimitive.Trigger>
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
