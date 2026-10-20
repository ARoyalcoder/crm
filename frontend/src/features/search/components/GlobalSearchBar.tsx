import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Target,
  TrendingUp,
  FileSpreadsheet,
  ShoppingBag,
  FolderKanban,
  Headphones,
  ReceiptText,
  UserCheck,
  Store,
  Clock,
  X,
} from 'lucide-react'
import { Search as AnimatedSearch } from '@/components/animate-ui/icons/search'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import { Icon3D } from '@/components/ui/icon-3d'
import { searchApi, type SearchResult, type EntityType } from '../api'

// Map entity types to colorful 3D animated icons
function EntityIcon({ type, className }: { type: string; className?: string }) {
  switch (type as EntityType) {
    case 'Customer':
      return <Icon3D icon={Users} size="xs" tone="blue" variant="solid-3d" className={className} />
    case 'Lead':
      return <Icon3D icon={Target} size="xs" tone="orange" variant="solid-3d" className={className} />
    case 'Opportunity':
      return <Icon3D icon={TrendingUp} size="xs" tone="emerald" variant="solid-3d" className={className} />
    case 'Quotation':
      return <Icon3D icon={FileSpreadsheet} size="xs" tone="cyan" variant="solid-3d" className={className} />
    case 'Order':
      return <Icon3D icon={ShoppingBag} size="xs" tone="indigo" variant="solid-3d" className={className} />
    case 'Project':
      return <Icon3D icon={FolderKanban} size="xs" tone="cyan" variant="solid-3d" className={className} />
    case 'Ticket':
      return <Icon3D icon={Headphones} size="xs" tone="rose" variant="solid-3d" className={className} />
    case 'Invoice':
      return <Icon3D icon={ReceiptText} size="xs" tone="teal" variant="solid-3d" className={className} />
    case 'Employee':
      return <Icon3D icon={UserCheck} size="xs" tone="violet" variant="solid-3d" className={className} />
    case 'Vendor':
      return <Icon3D icon={Store} size="xs" tone="amber" variant="solid-3d" className={className} />
    default:
      return <Icon3D icon={AnimatedSearch} size="xs" tone="blue" variant="solid-3d" className={className} />
  }
}

/** Header search: finds records across every module as you type, remembers recent searches, opens with Ctrl/Cmd+K. */
export function GlobalSearchBar() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Debounce the query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const searchResult = useQuery({
    ...searchApi.searchQuery(debouncedQuery, undefined, 20),
    enabled: debouncedQuery.trim().length >= 2,
  })

  const recentResult = useQuery({
    ...searchApi.recentQuery(),
    enabled: open && debouncedQuery.trim().length < 2,
  })

  const clearRecentMutation = useMutation({
    mutationFn: searchApi.clearRecent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search', 'recent'] }),
  })

  const results: SearchResult[] = searchResult.data ?? []
  const recentSearches: string[] = recentResult.data ?? []

  // Group results by entity type
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!grouped[r.entityType]) grouped[r.entityType] = []
    grouped[r.entityType].push(r)
  }

  // Flat list for keyboard navigation
  const flatResults = results

  function handleSelect(result: SearchResult) {
    void navigate(result.url)
    setOpen(false)
    setQuery('')
    setDebouncedQuery('')
    setSelectedIndex(-1)
  }

  function handleRecentSelect(q: string) {
    setQuery(q)
    setDebouncedQuery(q)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleSelect(flatResults[selectedIndex])
      } else if (query.trim()) {
        void navigate(`/search?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
      }
    }
  }

  const showDropdown = open && (debouncedQuery.trim().length >= 2 || recentSearches.length > 0)

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-md flex-1">
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 z-10">
          <Icon3D
            icon={AnimatedSearch}
            size="xs"
            tone="blue"
            variant="solid-3d"
            animateOnHover
            tilt={false}
          />
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search…"
          className={cn(
            'h-8.5 sm:h-9 w-full rounded-full border border-border/70 bg-card pr-12 pl-8.5 text-xs sm:text-[13px] shadow-soft transition-[border-color,box-shadow]',
            'placeholder:text-muted-foreground hover:border-input focus:border-ring focus:ring-[3px] focus:ring-ring/25 focus:outline-none [&::-webkit-search-cancel-button]:hidden',
          )}
          aria-label="Global search"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        {query ? (
          <button
            type="button"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => {
              setQuery('')
              setDebouncedQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:block"
          >
            Ctrl K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div
          id={listId}
          className="absolute top-full right-0 sm:left-0 sm:right-auto z-50 mt-2 w-[calc(100vw-2rem)] sm:w-full sm:min-w-[26rem] max-w-[calc(100vw-2rem)] sm:max-w-md overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-pop"
        >
          {debouncedQuery.trim().length < 2 && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between border-b px-3.5 py-2">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Recent searches</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => clearRecentMutation.mutate()}
                >
                  Clear
                </button>
              </div>
              <ul className="p-1.5">
                {recentSearches.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent"
                      onClick={() => handleRecentSelect(q)}
                    >
                      <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{q}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {debouncedQuery.trim().length >= 2 && (
            <>
              {searchResult.isPending && <div className="px-3.5 py-5 text-center text-sm text-muted-foreground">Searching…</div>}

              {searchResult.isError && (
                <div role="alert" className="px-3.5 py-5 text-center text-sm text-destructive">
                  Search is unavailable right now.
                </div>
              )}

              {!searchResult.isPending && !searchResult.isError && results.length === 0 && (
                <div className="px-3.5 py-5 text-center text-sm text-muted-foreground">No results for “{debouncedQuery}”</div>
              )}

              {results.length > 0 && (
                <div className="max-h-[28rem] overflow-y-auto">
                  <div role="listbox" aria-label="Search results">
                  {Object.entries(grouped).map(([type, items]) => (
                    <div key={type} role="group" aria-label={type}>
                      <div aria-hidden="true" className="bg-muted/50 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{type}</div>
                      <div className="p-1.5">
                        {items.map((result) => {
                          const flatIdx = flatResults.indexOf(result)
                          return (
                            <button
                              key={result.entityId}
                              type="button"
                              role="option"
                              aria-selected={flatIdx === selectedIndex}
                              className={cn(
                                'flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent',
                                flatIdx === selectedIndex && 'bg-accent',
                              )}
                              onClick={() => handleSelect(result)}
                            >
                              <EntityIcon type={result.entityType} className="mt-0.5 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">{result.title}</span>
                                  {result.status ? <StatusBadge status={result.status} plain className="shrink-0 px-2 py-0 text-[10px]" /> : null}
                                </div>
                                {result.subtitle ? <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p> : null}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  </div>

                  <div className="border-t px-3.5 py-2.5">
                    <button
                      type="button"
                      className="w-full text-center text-sm font-medium text-primary hover:underline"
                      onClick={() => {
                        void navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`)
                        setOpen(false)
                      }}
                    >
                      See all results for “{debouncedQuery}”
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
