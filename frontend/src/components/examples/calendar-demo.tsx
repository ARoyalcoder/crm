"use client"

import * as React from "react"
import {
  getLocalTimeZone,
  today,
  type CalendarDate,
} from "@internationalized/date"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/reui/badge"
import { CalendarIcon, Clock, Sparkles, CheckCircle2 } from "lucide-react"

export function CalendarDemo() {
  const [date, setDate] = React.useState<CalendarDate | null>(() =>
    today(getLocalTimeZone())
  )

  const formattedDate = React.useMemo(() => {
    if (!date) return "No date selected"
    const jsDate = date.toDate(getLocalTimeZone())
    return jsDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [date])

  const handleSetToday = () => {
    setDate(today(getLocalTimeZone()))
  }

  const handleSetTomorrow = () => {
    const t = today(getLocalTimeZone())
    setDate(t.add({ days: 1 }))
  }

  const handleSetNextWeek = () => {
    const t = today(getLocalTimeZone())
    setDate(t.add({ weeks: 1 }))
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 space-y-4">
      <Card className="p-6 bg-card text-card-foreground border-border/80 shadow-lg rounded-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-border/70 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Interactive Calendar</h3>
              <p className="text-xs text-muted-foreground">
                Powered by <code className="font-mono text-primary">@internationalized/date</code>
              </p>
            </div>
          </div>
          {date ? (
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 bg-primary/5 text-primary border-primary/20">
              <CheckCircle2 className="size-3.5" />
              <span>{date.toString()}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
              <Clock className="size-3.5" />
              <span>None</span>
            </Badge>
          )}
        </div>

        {/* The Exact User Snippet */}
        <div className="flex justify-center p-2">
          <Calendar
            value={date}
            onChange={setDate}
            className="rounded-lg border shadow-sm"
          />
        </div>

        {/* Selected Date Summary & Quick Presets */}
        <div className="mt-4 pt-4 border-t border-border/70 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Selected Day:</span>
            <span className="font-semibold text-foreground">{formattedDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetToday}
              className="text-xs h-7 gap-1"
            >
              <Sparkles className="size-3 text-amber-500" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetTomorrow}
              className="text-xs h-7"
            >
              Tomorrow
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetNextWeek}
              className="text-xs h-7"
            >
              +1 Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDate(null)}
              className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default CalendarDemo
