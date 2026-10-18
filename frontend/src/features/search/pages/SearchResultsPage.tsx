import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
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
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { searchApi, ENTITY_TYPES, type SearchResult, type EntityType } from '../api'

function EntityIcon({ type, className }: { type: string; className?: string }) {
  const props = { className: cn('h-4 w-4 shrink-0', className) }
  switch (type as EntityType) {
    case 'Customer':
      return <Users {...props} />
    case 'Lead':
      return <Target {...props} />
    case 'Opportunity':
      return <TrendingUp {...props} />
    case 'Quotation':
      return <FileSpreadsheet {...props} />
    case 'Order':
      return <ShoppingBag {...props} />
    case 'Project':
      return <FolderKanban {...props} />
    case 'Ticket':
      return <Headphones {...props} />
    case 'Invoice':
      return <ReceiptText {...props} />
    case 'Employee':
      return <UserCheck {...props} />
    case 'Vendor':
      return <Store {...props} />
    default:
      return <Search {...props} />
  }
}

function statusColor(status: string) {
  const s = status.toUpperCase()
  if (['ACTIVE', 'OPEN', 'WON', 'PAID', 'COMPLETED', 'RESOLVED', 'CLOSED'].includes(s)) {
    return 'bg-success-soft text-success'
  }
  if (['INACTIVE', 'LOST', 'CANCELLED', 'REJECTED', 'TERMINATED'].includes(s)) {
    return 'bg-destructive-soft text-destructive'
  }
  if (['DRAFT', 'PENDING_APPROVAL', 'IN_PROGRESS', 'PROBATION'].includes(s)) {
    return 'bg-warning-soft text-warning'
  }
  return 'bg-muted text-muted-foreground'
}

function ResultCard({ result }: { result: SearchResult }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left shadow-sm hover:bg-accent/50 transition-colors"
      onClick={() => navigate(result.url)}
    >
      <div className="mt-0.5 rounded-md bg-muted p-2">
        <EntityIcon type={result.entityType} className="text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{result.title}</span>
          {result.status && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                statusColor(result.status),
              )}
            >
              {result.status}
            </span>
          )}
        </div>
        {result.subtitle && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{result.subtitle}</p>
        )}
        {result.owner && (
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium">Owner:</span> {result.owner}
          </p>
        )}
      </div>
      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        {result.entityType}
      </span>
    </button>
  )
}

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQ)
  const [selectedType, setSelectedType] = useState<string>('All')

  const q = searchParams.get('q') ?? ''
  const types = selectedType === 'All' ? undefined : [selectedType]

  const { data, isPending, isError } = useQuery({
    ...searchApi.searchQuery(q, types, 50),
    enabled: q.trim().length >= 2,
  })

  const results: SearchResult[] = data ?? []

  // Count per entity type for the filter chips
  const allResults = useQuery({
    ...searchApi.searchQuery(q, undefined, 50),
    enabled: q.trim().length >= 2,
  })
  const allData: SearchResult[] = allResults.data ?? []
  const countByType: Record<string, number> = {}
  for (const r of allData) {
    countByType[r.entityType] = (countByType[r.entityType] ?? 0) + 1
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() })
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Search"
        description="Search customers, leads, projects, tickets and more."
      />

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search across all entities…"
            className={cn(
              'h-10 w-full rounded-md border bg-background pl-9 pr-4 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {/* Entity type filter chips */}
      {q && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              selectedType === 'All'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-accent',
            )}
            onClick={() => setSelectedType('All')}
          >
            All
            {allData.length > 0 && (
              <span className="ml-1.5 text-xs opacity-75">({allData.length})</span>
            )}
          </button>
          {ENTITY_TYPES.filter((t) => countByType[t] > 0).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                selectedType === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent',
              )}
              onClick={() => setSelectedType(type)}
            >
              <EntityIcon type={type} />
              {type}
              <span className="text-xs opacity-75">({countByType[type]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {!q ? (
        <div className="py-12 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Enter a search to find records.</p>
        </div>
      ) : isPending ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Could not load search results. Try again.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No results found for &quot;{q}&quot;</p>
          <p className="mt-1 text-xs">Try different keywords or remove filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{q}&quot;
            {selectedType !== 'All' && ` in ${selectedType}`}
          </p>
          {results.map((r) => (
            <ResultCard key={`${r.entityType}-${r.entityId}`} result={r} />
          ))}
        </div>
      )}
    </div>
  )
}
