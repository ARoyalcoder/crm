import { useState, useMemo, type ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, Check } from 'lucide-react'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type ChartTableModel = {
  /** Names the table for screen readers: "Revenue and collections by month". */
  caption: string
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  rows: Record<string, ReactNode>[]
}

/**
 * Extracts a numeric value from a cell ReactNode (string, number, or element)
 */
function parseCellNumber(val: ReactNode): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '')
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }
  return null
}

function formatSummaryNumber(num: number, sampleFormatted?: string): string {
  if (sampleFormatted && sampleFormatted.includes('₹')) {
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })}`
  }
  if (sampleFormatted && sampleFormatted.includes('$')) {
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })}`
  }
  if (sampleFormatted && sampleFormatted.includes('%')) {
    return `${num.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`
  }
  return num.toLocaleString('en-IN', { maximumFractionDigits: num % 1 === 0 ? 0 : 2 })
}

/** The table twin of a chart. Every value a chart draws is reachable here with sort, search, copy & totals. */
export function ChartTable({ caption, columns, rows }: ChartTableModel) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [copied, setCopied] = useState(false)

  // 1. Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const query = search.toLowerCase()
    return rows.filter((row) =>
      columns.some((col) => {
        const val = row[col.key]
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(query)
        }
        return false
      })
    )
  }, [rows, columns, search])

  // 2. Sort rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortKey]
      const valB = b[sortKey]
      const numA = parseCellNumber(valA)
      const numB = parseCellNumber(valB)

      if (numA !== null && numB !== null) {
        return sortDir === 'asc' ? numA - numB : numB - numA
      }
      const strA = String(valA ?? '').toLowerCase()
      const strB = String(valB ?? '').toLowerCase()
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [filteredRows, sortKey, sortDir])

  // 3. Compute Totals for numeric columns
  const columnTotals = useMemo(() => {
    const totals: Record<string, string | null> = {}
    for (const col of columns) {
      if (col.align === 'right') {
        const numbers = rows.map((r) => parseCellNumber(r[col.key])).filter((n): n is number => n !== null)
        if (numbers.length > 0) {
          const sum = numbers.reduce((acc, curr) => acc + curr, 0)
          const sample = rows.find((r) => typeof r[col.key] === 'string')?.[col.key] as string | undefined
          totals[col.key] = formatSummaryNumber(sum, sample)
        } else {
          totals[col.key] = null
        }
      } else {
        totals[col.key] = null
      }
    }
    return totals
  }, [columns, rows])

  const hasTotals = Object.values(columnTotals).some((v) => v !== null)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc')
      else {
        setSortKey(null)
        setSortDir('desc')
      }
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const handleCopy = () => {
    const headerRow = columns.map((c) => c.label).join('\t')
    const dataRows = sortedRows
      .map((r) => columns.map((c) => String(r[c.key] ?? '')).join('\t'))
      .join('\n')
    navigator.clipboard.writeText(`${headerRow}\n${dataRows}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      {/* Search and Action Bar (shown when table has more than 3 rows) */}
      {rows.length > 3 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/50"
            title="Copy table data as spreadsheet text"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      )}

      <Table containerClassName="max-h-[300px] overflow-auto border border-border/70 dark:border-slate-800/80 rounded-xl">
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-slate-100/90 dark:bg-slate-800/90">
            {columns.map((column) => {
              const isSorted = sortKey === column.key
              return (
                <TableHead
                  key={column.key}
                  scope="col"
                  onClick={() => handleSort(column.key)}
                  className={cn(
                    'cursor-pointer select-none py-2 text-[11px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-200 transition-colors hover:text-primary dark:hover:text-blue-400',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  <div className={cn('inline-flex items-center gap-1', column.align === 'right' && 'flex-row-reverse')}>
                    <span>{column.label}</span>
                    {isSorted ? (
                      sortDir === 'desc' ? (
                        <ArrowDown className="size-3 text-primary dark:text-blue-400" />
                      ) : (
                        <ArrowUp className="size-3 text-primary dark:text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="size-2.5 opacity-40 hover:opacity-100" />
                    )}
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-6 text-xs text-muted-foreground">
                No matching rows found
              </TableCell>
            </TableRow>
          ) : (
            sortedRows.map((row, index) => (
              <TableRow
                key={index}
                className={cn(
                  'transition-colors duration-100 hover:bg-primary/[0.04] dark:hover:bg-blue-500/[0.08]',
                  index % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-900/30'
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      'py-2 text-xs text-slate-800 dark:text-slate-200',
                      column.align === 'right' && 'text-right tabular font-medium'
                    )}
                  >
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {hasTotals && sortedRows.length > 1 && (
          <TableFooter className="bg-slate-100/90 dark:bg-slate-800/95 font-bold border-t border-border">
            <TableRow className="hover:bg-transparent">
              {columns.map((column, idx) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'py-2 text-xs font-bold text-foreground dark:text-white',
                    column.align === 'right' && 'text-right tabular text-primary dark:text-blue-400'
                  )}
                >
                  {idx === 0
                    ? `Total (${sortedRows.length})`
                    : columnTotals[column.key] ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}
