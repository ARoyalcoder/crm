"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"
import {
  CalendarDate,
  getLocalTimeZone,
  type DateValue,
} from "@internationalized/date"
import { Button, buttonVariants } from "@/components/ui/button"

export interface CalendarProps
  extends Omit<React.ComponentProps<typeof DayPicker>, "selected" | "onSelect" | "mode"> {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  mode?: "single" | "multiple" | "range" | "default"
  value?: CalendarDate | DateValue | Date | null
  defaultValue?: CalendarDate | DateValue | Date | null
  onChange?: (date: CalendarDate | null) => void
  selected?: any
  onSelect?: any
}

function toJsDate(val: CalendarDate | DateValue | Date | null | undefined): Date | undefined {
  if (!val) return undefined
  if (val instanceof Date) return val
  if ("toDate" in val && typeof (val as any).toDate === "function") {
    try {
      return (val as any).toDate(getLocalTimeZone())
    } catch {
      return new Date(val.year, val.month - 1, val.day)
    }
  }
  if ("year" in val && "month" in val && "day" in val) {
    return new Date(val.year, val.month - 1, val.day)
  }
  return undefined
}

function toCalendarDate(date: Date | undefined | null): CalendarDate | null {
  if (!date) return null
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  value,
  defaultValue,
  onChange,
  selected: propSelected,
  onSelect: propOnSelect,
  mode: propMode,
  defaultMonth: propDefaultMonth,
  month: propMonth,
  onMonthChange: propOnMonthChange,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  const isControlledValue = value !== undefined
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() => {
    return toJsDate(defaultValue)
  })

  const selectedDate = isControlledValue ? toJsDate(value) : (internalDate ?? propSelected)

  const [currentMonth, setCurrentMonth] = React.useState<Date | undefined>(() => {
    return propMonth ?? propDefaultMonth ?? selectedDate ?? new Date()
  })

  React.useEffect(() => {
    if (selectedDate && !propMonth) {
      setCurrentMonth(selectedDate)
    }
  }, [selectedDate, propMonth])

  const handleSelect = React.useCallback(
    (newDate: any, triggeredDate: any, modifiers: any, e: any) => {
      if (!isControlledValue) {
        setInternalDate(newDate instanceof Date ? newDate : undefined)
      }
      if (onChange) {
        onChange(newDate instanceof Date ? toCalendarDate(newDate) : null)
      }
      propOnSelect?.(newDate, triggeredDate, modifiers, e)
    },
    [isControlledValue, onChange, propOnSelect]
  )

  const resolvedMonth = propMonth ?? currentMonth
  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month)
    propOnMonthChange?.(month)
  }

  const isAriaPattern = isControlledValue || onChange !== undefined || defaultValue !== undefined
  const resolvedMode = (propMode ?? (isAriaPattern ? "single" : undefined)) as any

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-card text-card-foreground p-3 rounded-xl border border-border/70 shadow-sm [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      mode={resolvedMode}
      selected={selectedDate}
      onSelect={handleSelect}
      month={resolvedMonth}
      onMonthChange={handleMonthChange}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "font-medium select-none text-foreground",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md",
          (props as any).showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(rootClassName)}
              {...rootProps}
            />
          )
        },
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", chevronClassName)} {...chevronProps} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", chevronClassName)}
                {...chevronProps}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", chevronClassName)} {...chevronProps} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekProps }) => {
          return (
            <td {...weekProps}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
