"use client"

import * as React from "react"
import {
  getLocalTimeZone,
  type CalendarDate,
} from "@internationalized/date"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value?: CalendarDate | null
  onChange?: (date: CalendarDate | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const formattedValue = React.useMemo(() => {
    if (!value) return null
    try {
      const jsDate = value.toDate(getLocalTimeZone())
      return jsDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return value.toString()
    }
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal gap-2 h-8 sm:h-8.5",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formattedValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 border border-border/80 shadow-pop">
        <Calendar
          value={value}
          onChange={(newDate) => {
            onChange?.(newDate)
            setOpen(false)
          }}
          className="border-0 shadow-none"
        />
      </PopoverContent>
    </Popover>
  )
}
