import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/format'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  /** Also the accessible name, e.g. "Search services". */
  label: string
}

/** Search box that waits for a pause in typing before asking for new results. */
export function SearchInput({ value, onChange, label }: SearchInputProps) {
  const [text, setText] = useState(value)

  // Keep the box in step when the URL changes underneath it (back button, cleared filters).
  const [lastValue, setLastValue] = useState(value)
  if (lastValue !== value) {
    setLastValue(value)
    setText(value)
  }

  useEffect(() => {
    if (text.trim() === value) {
      return
    }
    const timer = setTimeout(() => onChange(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <div className="relative w-full sm:w-52 lg:w-56 xl:w-64">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-9 text-xs sm:text-sm pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            onChange('')
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

type FilterSelectProps = {
  /** Accessible name, e.g. "Vertical". */
  label: string
  value: string
  onChange: (value: string) => void
  /** Text of the "no filter" choice, e.g. "All verticals". */
  allLabel: string
  options: { value: string; label: string }[]
}

export function FilterSelect({ label, value, onChange, allLabel, options }: FilterSelectProps) {
  const items = [
    { label: allLabel, value: '' },
    ...options,
  ]

  return (
    <Select
      items={items}
      value={value}
      onValueChange={onChange}
      className="w-full sm:w-36 lg:w-40 xl:w-48"
    >
      <SelectTrigger
        className="w-full h-9 text-xs sm:text-sm"
        aria-label={label}
      >
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value || '__all'} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

type FilterBarProps = {
  children: ReactNode
  /** Shown as "Clear filters" when set; the page decides when anything is filtered. */
  onReset?: () => void
  className?: string
}

/**
 * The single row of search box and filters above a list or a set of charts. Wraps on small screens,
 * scopes everything below it, and offers one way back to the unfiltered view.
 */
export function FilterBar({ children, onReset, className }: FilterBarProps) {
  return (
    <div role="search" className={['flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className].filter(Boolean).join(' ')}>
      {children}
      {onReset ? (
        <Button variant="ghost" size="sm" onClick={onReset} className="self-start text-muted-foreground sm:self-auto">
          <X aria-hidden="true" />
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}

/** Name used by the existing list screens. */
export const ListToolbar = FilterBar

type PaginationProps = {
  page: number
  totalPages: number
  totalItems: number
  /** What is being counted, plural and singular: "services", "service". */
  noun: string
  singular: string
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalItems, noun, singular, onPageChange }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground tabular">{formatNumber(totalItems)}</span> {totalItems === 1 ? singular : noun}
        {totalPages > 1 ? <span className="tabular"> · page {page + 1} of {totalPages}</span> : null}
      </p>
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
