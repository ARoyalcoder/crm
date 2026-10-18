import * as React from 'react'
import * as Primitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const DropdownMenu = Primitive.Root
const DropdownMenuGroup = Primitive.Group
const DropdownMenuSub = Primitive.Sub
const DropdownMenuRadioGroup = Primitive.RadioGroup

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  Primitive.DropdownMenuTriggerProps & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render?: React.ReactElement<any>
  }
>(({ render, asChild, children, ...props }, ref) => {
  if (render) {
    return (
      <Primitive.Trigger ref={ref} asChild {...props}>
        {render}
      </Primitive.Trigger>
    )
  }
  return (
    <Primitive.Trigger ref={ref} asChild={asChild} {...props}>
      {children}
    </Primitive.Trigger>
  )
})
DropdownMenuTrigger.displayName = Primitive.Trigger.displayName

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuContentProps
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-50 min-w-48 overflow-hidden rounded-lg border bg-card p-1 text-card-foreground shadow-pop', className)}
      {...props}
    />
  </Primitive.Portal>
))
DropdownMenuContent.displayName = Primitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuItemProps & { variant?: string }
>(({ className, variant, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0',
      variant === 'destructive' && 'text-destructive focus:bg-destructive focus:text-destructive-foreground',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = Primitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuCheckboxItemProps
>(({ className, children, checked, ...props }, ref) => (
  <Primitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Primitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </Primitive.ItemIndicator>
    </span>
    {children}
  </Primitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = Primitive.CheckboxItem.displayName

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuSubTriggerProps & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <Primitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
  </Primitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = Primitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuSubContentProps & { side?: string }
>(({ className, side: _side, ...props }, ref) => (
  <Primitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = Primitive.SubContent.displayName

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuLabelProps & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <Primitive.Label
    ref={ref}
    className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', inset && 'pl-8', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = Primitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  Primitive.DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <Primitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = Primitive.Separator.displayName

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}
