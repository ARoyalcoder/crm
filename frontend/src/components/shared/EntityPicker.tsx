import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export type PickerOption = {
  id: string
  name: string
  /** A second line that helps tell similar names apart: a number, a phone, a role. */
  hint?: string
  /** Anything else the form needs about the record, as text (an employee's user id). */
  data?: Record<string, string>
}

export type PickerMatches = {
  options?: PickerOption[]
  isPending: boolean
  error?: unknown
}

type EntityPickerProps = {
  /** What is being chosen, as a lowercase noun: "customer". */
  noun: string
  /** The chosen record, if any. */
  value: PickerOption | null
  onChange: (option: PickerOption | null) => void
  /**
   * Looks up the records that match what was typed. A hook, so each picker decides how it asks the server
   * (a search endpoint, or a short list filtered here). `enabled` is false until enough has been typed.
   */
  useMatches: (term: string, enabled: boolean) => PickerMatches
  /** How many characters must be typed before looking (0 shows the choices as soon as the box is focused). */
  minChars?: number
  placeholder?: string
  /** Shown under the box when nothing is chosen and the form was submitted. */
  error?: string
  /** The id of the search box, so a form label can point at it. */
  id?: string
  disabled?: boolean
}

/**
 * Finds a record by typing a few letters of its name instead of pasting an id. The matches drop down under the box and
 * can be picked with the mouse or the arrow keys; once chosen the record shows with a way to change it. Used wherever a
 * form needs a customer, project, employee or service.
 */
export function EntityPicker({ noun, value, onChange, useMatches, minChars = 2, placeholder, error, id, disabled }: EntityPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const generated = useId()
  const listId = useId()
  const inputId = id ?? generated
  const wrapper = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const term = search.trim()
  const ready = term.length >= minChars
  const matches = useMatches(term, value === null && ready)

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
        <span className="min-w-0">
          <span className="block truncate font-medium">{value.name}</span>
          {value.hint ? <span className="block truncate text-xs text-muted-foreground">{value.hint}</span> : null}
        </span>
        {disabled ? null : (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-sm text-primary underline-offset-2 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            onClick={() => onChange(null)}
          >
            <X className="size-3.5" aria-hidden="true" />
            Change {noun}
          </button>
        )}
      </div>
    )
  }

  const options = matches.options ?? []
  const showPanel = open && ready && !disabled

  const choose = (option: PickerOption) => {
    onChange(option)
    setSearch('')
    setOpen(false)
  }
  const buttons = () => Array.from(list.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])

  // The panel stays open while focus is anywhere inside the picker (box or options) and closes when it leaves.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!wrapper.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
  }
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      buttons()[0]?.focus()
    } else if (event.key === 'Escape' && showPanel) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = buttons()
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[Math.min(index + 1, items.length - 1)]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (index <= 0) input.current?.focus()
      else items[index - 1]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      input.current?.focus()
    }
  }

  return (
    <div ref={wrapper} className="grid gap-2" onBlur={onBlur}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={input}
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          aria-label={`Find a ${noun}`}
          aria-invalid={error ? true : undefined}
          placeholder={placeholder ?? `Type to find a ${noun}`}
          value={search}
          disabled={disabled}
          className="pl-9 [&::-webkit-search-cancel-button]:hidden"
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          onChange={(event) => {
            setSearch(event.target.value)
            setOpen(true)
          }}
        />
        {showPanel ? (
          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-card p-1 shadow-pop">
            {matches.isPending ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
            ) : matches.error ? (
              <p role="alert" className="px-3 py-2 text-sm text-destructive">
                Could not look up {noun}s. Try again.
              </p>
            ) : options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{term ? `No ${noun} matches “${term}”.` : `There is no ${noun} to choose from.`}</p>
            ) : (
              <ul id={listId} ref={list} className="grid gap-0.5" aria-label={`Matching ${noun}s`} onKeyDown={onListKeyDown}>
                {options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      onClick={() => choose(option)}
                    >
                      <span className="min-w-0 truncate font-medium">{option.name}</span>
                      {option.hint ? <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
