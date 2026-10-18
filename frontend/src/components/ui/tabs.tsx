import { createContext, useContext, type ComponentProps } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

type TabsVariant = 'pill' | 'line'
const VariantContext = createContext<TabsVariant>('pill')

/**
 * Accessible tabs (arrow keys move between tabs, Home/End jump, panels are labelled by their tab).
 * `variant="pill"` is a segmented switch; `variant="line"` is the underline style used for the
 * sections of a page. Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
function Tabs({ className, variant = 'pill', ...props }: ComponentProps<typeof TabsPrimitive.Root> & { variant?: TabsVariant }) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.Root data-slot="tabs" className={cn('flex w-full flex-col gap-4', className)} {...props} />
    </VariantContext.Provider>
  )
}

function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const variant = useContext(VariantContext)
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        variant === 'pill'
          ? 'inline-flex h-8.5 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-0.5 text-muted-foreground'
          : 'flex w-full items-center gap-1 overflow-x-auto border-b text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = useContext(VariantContext)
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1 text-xs sm:text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
        variant === 'pill'
          ? 'h-7 rounded-md px-2.5 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-soft'
          : '-mb-px h-8.5 rounded-t-md border-b-2 border-transparent px-2.5 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
