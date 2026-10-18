import { useState } from 'react'
import { CalendarRange, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RANGE_PRESETS, isValidRange, type DateRange, type RangePresetId } from '@/lib/date-range'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type DateRangeFilterProps = {
  range: DateRange
  /** The preset the range equals, or null for a custom range. */
  preset: RangePresetId | null
  onPreset: (id: RangePresetId) => void
  onCustom: (range: DateRange) => void
  className?: string
}

/**
 * Date-range control for a dashboard: presets as rows (nobody fights a calendar grid for "last 30
 * days"), the chosen one ticked, and a custom range tucked below a hairline. It scopes everything under it.
 */
export function DateRangeFilter({ range, preset, onPreset, onCustom, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const label = preset ? (RANGE_PRESETS.find((p) => p.id === preset)?.label ?? '') : `${formatDate(range.from)} – ${formatDate(range.to)}`
  const customValid = isValidRange({ from, to })

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setFrom(range.from)
          setTo(range.to)
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-between gap-2', className)} aria-label={`Date range: ${label}`}>
          <CalendarRange className="text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{label}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5 max-h-[min(90vh,540px)] flex flex-col">
        <div className="overflow-y-auto max-h-56 sm:max-h-60 overscroll-contain pr-1 custom-scroll">
          <ul role="listbox" aria-label="Date range presets" className="grid gap-0.5">
            {RANGE_PRESETS.map((p) => {
              const selected = preset === p.id
              return (
                <li key={p.id}>
                  <PopoverClose asChild>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => onPreset(p.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent cursor-pointer',
                        selected && 'font-semibold bg-accent/50',
                      )}
                    >
                      <span className="grid">
                        <span>{p.label}</span>
                        <span className="text-xs font-normal text-muted-foreground">{p.hint}</span>
                      </span>
                      {selected ? <Check className="size-4 text-primary shrink-0" aria-hidden="true" /> : null}
                    </button>
                  </PopoverClose>
                </li>
              )
            })}
          </ul>
        </div>
        <form
          className="mt-1.5 grid gap-3 border-t px-3 pt-3 pb-2 shrink-0 bg-popover"
          onSubmit={(event) => {
            event.preventDefault()
            if (!customValid) return
            onCustom({ from, to })
            setOpen(false)
          }}
        >
          <p className="text-xs font-medium text-muted-foreground">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label htmlFor="range-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input id="range-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="range-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input id="range-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={!customValid}>
            Apply range
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
