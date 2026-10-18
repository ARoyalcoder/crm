import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'
import { controlClass } from '@/components/ui/input'

export interface SelectItemObject {
  label: React.ReactNode
  value: any
  disabled?: boolean
  color?: string
  [key: string]: any
}

interface SelectContextValue<T = any> {
  value?: T
  selectedItem?: T
  onValueChange?: (val: T) => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLButtonElement | null>
  selectedLabel?: React.ReactNode
  setSelectedLabel: (label: React.ReactNode) => void
  placeholder?: string
  setPlaceholder: (placeholder: string) => void
  items?: T[]
  disabled?: boolean
  name?: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

export interface CompositeSelectProps<T = any>
  extends Omit<React.ComponentProps<'select'>, 'value' | 'defaultValue' | 'onChange'> {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  onBlur?: React.FocusEventHandler<any>
  items?: T[]
  children?: React.ReactNode
  className?: string
  disabled?: boolean
  name?: string
  id?: string
  placeholder?: string
  'aria-label'?: string
}

export type NativeSelectProps = CompositeSelectProps

/** Checks if props or children describe an explicit composite Shadcn select */
function isExplicitComposite(props: CompositeSelectProps): boolean {
  return (
    'onValueChange' in props ||
    'items' in props ||
    ('children' in props &&
      React.Children.toArray(props.children).some(
        (c) => React.isValidElement(c) && (c.type === SelectTrigger || c.type === SelectContent),
      ))
  )
}

/** Parses <option> children into { label, value, disabled } */
function parseOptionChildren(children: React.ReactNode): SelectItemObject[] {
  const result: SelectItemObject[] = []
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const p = child.props as any
      result.push({
        label: p.children != null ? p.children : String(p.value ?? ''),
        value: p.value !== undefined ? p.value : '',
        disabled: Boolean(p.disabled),
      })
    }
  })
  return result
}

function CompositeSelectImpl<T = any>({
  value: controlledValue,
  defaultValue,
  onValueChange,
  onChange,
  onBlur,
  items,
  children,
  className,
  disabled = false,
  name,
  placeholder = '',
  'aria-label': ariaLabel,
}: CompositeSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<T | undefined>(controlledValue ?? defaultValue)
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null)
  const [currentPlaceholder, setCurrentPlaceholder] = React.useState<string>(placeholder)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  const activeValue = controlledValue !== undefined ? controlledValue : internalValue

  // Derive selected item from items array or value
  const selectedItem = React.useMemo(() => {
    if (activeValue && typeof activeValue === 'object') return activeValue
    if (items && items.length > 0) {
      return items.find((item: any) => {
        if (item === activeValue) return true
        if (item && typeof item === 'object') {
          return item.value === activeValue || item.id === activeValue
        }
        return false
      })
    }
    return activeValue
  }, [activeValue, items])

  const handleValueChange = React.useCallback(
    (newVal: T) => {
      setInternalValue(newVal)
      onValueChange?.(newVal)
      if (onChange) {
        onChange({ target: { name, value: newVal } } as any)
      }
    },
    [onValueChange, onChange, name],
  )

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.closest('[data-slot="select-root"]')?.contains(event.target as Node)
      ) {
        setOpen(false)
        if (onBlur) {
          onBlur({ target: { name } } as any)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onBlur, name])

  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <SelectContext.Provider
      value={{
        value: activeValue,
        selectedItem,
        onValueChange: handleValueChange,
        open,
        setOpen,
        triggerRef,
        selectedLabel,
        setSelectedLabel,
        placeholder: currentPlaceholder || placeholder,
        setPlaceholder: setCurrentPlaceholder,
        items,
        disabled,
        name,
      }}
    >
      <div
        data-slot="select-root"
        className={cn('relative inline-block w-full', className)}
        aria-label={ariaLabel}
      >
        {children}
        {name && <input type="hidden" name={name} value={String(activeValue ?? '')} />}
      </div>
    </SelectContext.Provider>
  )
}

/**
 * Universal Shadcn Select Component
 * Fully supports:
 * 1. Standard composite Shadcn syntax:
 *    <Select items={items}>
 *      <SelectTrigger className="w-[180px]">
 *        <SelectValue placeholder="Theme" />
 *      </SelectTrigger>
 *      <SelectContent>
 *        <SelectGroup>
 *          {items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
 *        </SelectGroup>
 *      </SelectContent>
 *    </Select>
 * 2. Automatic conversion of legacy <option> children into Shadcn styled dropdowns
 *    without breaking existing form registrations or event handlers.
 */
export function Select(props: CompositeSelectProps) {
  // 1. Explicit composite usage with SelectTrigger/SelectContent
  if (isExplicitComposite(props)) {
    return <CompositeSelectImpl {...props} />
  }

  // 2. Children contain <option> tags: automatically wrap into Shadcn dropdown!
  const hasOptions =
    'children' in props &&
    React.Children.toArray(props.children).some((c) => React.isValidElement(c) && c.type === 'option')

  if (hasOptions) {
    const { className, disabled, id, name, value, defaultValue, onChange, onBlur, children, ...rest } =
      props as any
    const parsedItems = parseOptionChildren(children)
    const initialPlaceholder = parsedItems[0]?.value === '' ? parsedItems[0].label : 'Select an option'

    return (
      <CompositeSelectImpl
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        items={parsedItems}
        className={className}
        disabled={disabled}
        name={name}
        id={id}
        placeholder={typeof initialPlaceholder === 'string' ? initialPlaceholder : ''}
        {...rest}
      >
        <SelectTrigger className={className} id={id}>
          <SelectValue placeholder={typeof initialPlaceholder === 'string' ? initialPlaceholder : ''} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {parsedItems.map((item) => (
              <SelectItem
                key={String(item.value) || '__empty'}
                value={item.value}
                disabled={item.disabled}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </CompositeSelectImpl>
    )
  }

  // 3. Fallback to CompositeSelectImpl
  return <CompositeSelectImpl {...(props as CompositeSelectProps)} />
}

export function SelectTrigger({
  className,
  children,
  size,
  disabled: propDisabled,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  size?: 'default' | 'sm' | 'lg' | string
}) {
  const ctx = React.useContext(SelectContext)
  const isDisabled = propDisabled || ctx?.disabled

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={ctx?.open}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      ref={ctx?.triggerRef}
      onClick={() => {
        if (!isDisabled) {
          ctx?.setOpen((prev) => !prev)
        }
      }}
      className={cn(
        'flex h-8 sm:h-8.5 items-center justify-between py-1.5 px-3 transition-colors',
        controlClass,
        isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 opacity-60 ml-2 shrink-0 transition-transform duration-200',
          ctx?.open && 'rotate-180',
        )}
      />
    </button>
  )
}

export function SelectValue({
  placeholder,
  children,
  className,
}: {
  placeholder?: string
  children?: React.ReactNode | ((item: any) => React.ReactNode)
  className?: string
}) {
  const ctx = React.useContext(SelectContext)

  React.useEffect(() => {
    if (placeholder && ctx?.setPlaceholder) {
      ctx.setPlaceholder(placeholder)
    }
  }, [placeholder, ctx])

  let displayText: React.ReactNode = null

  if (typeof children === 'function') {
    displayText = children(ctx?.selectedItem ?? ctx?.value)
  } else if (children) {
    displayText = children
  } else if (ctx?.selectedItem && typeof ctx.selectedItem === 'object' && 'label' in ctx.selectedItem) {
    displayText = (ctx.selectedItem as any).label
  } else if (ctx?.selectedLabel) {
    displayText = ctx.selectedLabel
  } else if (ctx?.value !== undefined && ctx?.value !== null && ctx?.value !== '') {
    displayText = String(ctx.value)
  } else {
    displayText = placeholder || ctx?.placeholder || ''
  }

  const hasValue = Boolean(
    (ctx?.value !== undefined && ctx?.value !== null && ctx?.value !== '') ||
      ctx?.selectedItem ||
      (typeof children === 'function' && displayText),
  )

  return (
    <span
      className={cn(
        'truncate flex items-center gap-1.5 text-xs sm:text-[13px]',
        !hasValue && 'text-muted-foreground',
        className,
      )}
    >
      {displayText}
    </span>
  )
}

export function SelectGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" data-slot="select-group" className={cn('p-0.5', className)} {...props}>
      {children}
    </div>
  )
}

export function SelectContent({
  className,
  children,
  align,
  alignItemWithTrigger,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: 'start' | 'center' | 'end' | string
  alignItemWithTrigger?: boolean
}) {
  const ctx = React.useContext(SelectContext)
  if (!ctx?.open) return null

  return (
    <div
      data-slot="select-content"
      className={cn(
        'absolute z-50 min-w-[8rem] max-h-60 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-pop top-full mt-1.5 w-full backdrop-blur-md animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectItem({
  value,
  children,
  className,
  disabled,
  ...props
}: {
  value: any
  children: React.ReactNode
  disabled?: boolean
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'value'>) {
  const ctx = React.useContext(SelectContext)

  // Compare whether this item is currently selected
  const isSelected = React.useMemo(() => {
    if (!ctx) return false
    if (ctx.value === value || ctx.selectedItem === value) return true
    if (typeof value === 'object' && value !== null) {
      const itemVal = value.value ?? value.id
      const ctxVal =
        typeof ctx.value === 'object' && ctx.value !== null
          ? (ctx.value.value ?? ctx.value.id)
          : ctx.value
      const ctxItemVal =
        ctx.selectedItem && typeof ctx.selectedItem === 'object'
          ? (ctx.selectedItem.value ?? ctx.selectedItem.id)
          : undefined
      return itemVal === ctxVal || (ctxItemVal !== undefined && itemVal === ctxItemVal)
    }
    if (typeof ctx.value === 'object' && ctx.value !== null) {
      return (ctx.value.value ?? ctx.value.id) === value
    }
    // String matching
    if (ctx.value !== undefined && value !== undefined) {
      return String(ctx.value) === String(value)
    }
    return false
  }, [ctx, value])

  React.useEffect(() => {
    if (isSelected && ctx?.setSelectedLabel && typeof children !== 'function') {
      ctx.setSelectedLabel(children)
    }
  }, [isSelected, children, ctx])

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) return
        ctx?.onValueChange?.(value)
        if (typeof children !== 'function') {
          ctx?.setSelectedLabel(children)
        }
        ctx?.setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg py-1.5 px-2.5 text-xs sm:text-[13px] outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        isSelected && 'bg-accent/80 font-semibold text-primary dark:text-blue-400',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate min-w-0">{children}</div>
      {isSelected ? <Check className="size-3.5 shrink-0 text-primary dark:text-blue-400" /> : null}
    </div>
  )
}
