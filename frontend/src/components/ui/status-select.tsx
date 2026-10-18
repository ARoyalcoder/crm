import * as React from 'react'
import { cn } from '@/lib/utils'
import { Field } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const statuses = [
  { value: '1', label: 'In Progress', color: 'bg-violet-500' },
  { value: '2', label: 'Completed', color: 'bg-green-500' },
  { value: '3', label: 'Pending', color: 'bg-primary' },
  { value: '4', label: 'Cancelled', color: 'bg-yellow-500' },
  { value: '5', label: 'Rejected', color: 'bg-destructive' },
]

/**
 * Pattern component from @reui/c-select-17
 */
export function Pattern() {
  return (
    <Field className="max-w-xs">
      <Select defaultValue={statuses[1]} items={statuses}>
        <SelectTrigger>
          <SelectValue>
            {(item: (typeof statuses)[number]) => (
              <span className="flex items-center gap-2">
                <span className={cn('size-1.5 rounded-full', item?.color)} />
                <span>{item?.label}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status}>
                <span className="flex items-center gap-2">
                  <span className={cn('size-1.5 rounded-full', status.color)} />
                  <span>{status.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

export interface StatusOption {
  value: string
  label: string
  color: string
}

export interface StatusSelectProps {
  value?: string
  defaultValue?: string | StatusOption
  onValueChange?: (value: string) => void
  statuses: readonly StatusOption[] | StatusOption[]
  className?: string
  triggerClassName?: string
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Production-ready reusable status dropdown component based on @reui/c-select-17
 * featuring colored status dots and accessible keyboard navigation.
 */
export function StatusSelect({
  value,
  defaultValue,
  onValueChange,
  statuses: statusList,
  className,
  triggerClassName,
  placeholder = 'Select status',
  disabled,
  'aria-label': ariaLabel,
}: StatusSelectProps) {
  const selectedStatus = React.useMemo(() => {
    if (!value) return undefined
    return statusList.find((s) => s.value === value)
  }, [value, statusList])

  const defaultStatus = React.useMemo(() => {
    if (!defaultValue) return undefined
    if (typeof defaultValue === 'object') return defaultValue
    return statusList.find((s) => s.value === defaultValue)
  }, [defaultValue, statusList])

  return (
    <div className={cn('relative inline-block min-w-0', className)}>
      <Select
        value={selectedStatus}
        defaultValue={defaultStatus}
        items={statusList as StatusOption[]}
        onValueChange={(item: StatusOption | string) => {
          const val = typeof item === 'object' && item !== null ? item.value : item
          onValueChange?.(val)
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={ariaLabel} className={cn('h-8 text-xs', triggerClassName)}>
          <SelectValue placeholder={placeholder}>
            {(item: StatusOption) =>
              item ? (
                <span className="flex items-center gap-2 truncate">
                  <span className={cn('size-1.5 rounded-full shrink-0', item.color)} />
                  <span className="truncate">{item.label}</span>
                </span>
              ) : null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {statusList.map((status) => (
              <SelectItem key={status.value} value={status}>
                <span className="flex items-center gap-2">
                  <span className={cn('size-1.5 rounded-full shrink-0', status.color)} />
                  <span>{status.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
