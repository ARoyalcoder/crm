import type { ReactNode } from 'react'
import { createColumnHelper, tableFeatures, useTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * The app-wide table. TanStack Table owns the row/column model; this component owns the markup.
 * Sorting is done by the server (the list endpoints take `sort=field,dir`), so the table only shows
 * the current order and asks for a new one; it never reorders rows itself.
 */
export const dataTableFeatures = tableFeatures({})
type Features = typeof dataTableFeatures

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cell value types differ per column
export type DataTableColumn<TData extends RowData> = ColumnDef<Features, TData, any>

/** Typed column builder: `const col = dataTableColumns<Lead>(); col.accessor('name', {...})`. */
export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<Features, TData>()
}

type DataTableProps<TData extends RowData> = {
  /** Define at module scope (or memoise): a new array on every render rebuilds the table model. */
  columns: DataTableColumn<TData>[]
  data: TData[]
  /** Read by screen readers; describe what the rows are. */
  caption: string
  emptyMessage?: string
  /** A fuller empty state (icon, text, action) shown instead of `emptyMessage`. */
  empty?: ReactNode
  /** Show placeholder rows instead of data. */
  loading?: boolean
  /** Ids of columns whose values are numbers or amounts: header and cells align to the right. */
  alignRight?: string[]
  /**
   * Server sort. `value` is the current `field,dir` ("score,desc"), `keys` maps a column id to the field the
   * server sorts by; only those columns get a sort button.
   */
  sort?: { value: string; onChange: (value: string) => void; keys: Record<string, string> }
  /** Mouse shortcut for opening a row. The row's own link stays the keyboard and screen-reader path. */
  onRowClick?: (row: TData) => void
  /** `compact` for dense tables inside cards and drawers. */
  density?: 'comfortable' | 'compact'
  /** Enable alternating zebra row backgrounds for high readability on wide monitors. */
  striped?: boolean
  /** Show summary footer count at the bottom of the table. */
  showCount?: boolean
  className?: string
}

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="menuitem"]'

function nextSort(current: string, key: string): string {
  const [field, dir] = current.split(',')
  if (field !== key) return `${key},asc`
  return dir === 'asc' ? `${key},desc` : ''
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  caption,
  emptyMessage = 'Nothing to show yet.',
  empty,
  loading,
  alignRight = [],
  sort,
  onRowClick,
  density = 'comfortable',
  striped = true,
  showCount = true,
  className,
}: DataTableProps<TData>) {
  const table = useTable({ features: dataTableFeatures, columns, data })
  const rows = table.getRowModel().rows
  const [sortField, sortDir] = (sort?.value ?? '').split(',')

  return (
    <div className="w-full space-y-1">
      <Table className={className}>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const key = sort?.keys[header.column.id]
                const active = key !== undefined && sortField === key
                const ariaSort = active ? (sortDir === 'desc' ? 'descending' : 'ascending') : key ? 'none' : undefined
                const right = alignRight.includes(header.column.id)
                const content = header.isPlaceholder ? null : <table.FlexRender header={header} />
                return (
                  <TableHead key={header.id} scope="col" aria-sort={ariaSort} className={cn(right && 'text-right')}>
                    {key && sort ? (
                      <button
                        type="button"
                        onClick={() => sort.onChange(nextSort(sort.value, key))}
                        className={cn(
                          '-mx-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 hover:text-slate-900 dark:hover:text-white cursor-pointer',
                          active ? 'text-primary dark:text-blue-400 font-bold bg-primary/10 dark:bg-blue-900/30' : 'text-slate-700 dark:text-slate-200',
                          right && 'flex-row-reverse',
                        )}
                        title={`Sort by ${header.column.id}`}
                      >
                        {content}
                        {active ? (
                          sortDir === 'desc' ? (
                            <ArrowDown className="size-3.5 animate-in zoom-in-50 duration-150" aria-hidden="true" />
                          ) : (
                            <ArrowUp className="size-3.5 animate-in zoom-in-50 duration-150" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40 hover:opacity-100 transition-opacity" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((_, c) => (
                  <TableCell key={c} className={density === 'compact' ? 'py-2' : undefined}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {empty ?? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground mb-3">
                      <Inbox className="size-6 opacity-60" />
                    </div>
                    <p className="text-sm font-semibold text-foreground dark:text-slate-200">{emptyMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      No records to show. Adjust your search or filters.
                    </p>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={row.id}
                className={cn(
                  'transition-all duration-200 animate-in fade-in-50 slide-in-from-bottom-1 fill-mode-both',
                  striped && index % 2 === 1 && 'bg-slate-50/40 dark:bg-slate-900/30',
                  onRowClick && 'cursor-pointer hover:bg-primary/[0.04] dark:hover:bg-blue-500/[0.08] active:scale-[0.998]',
                )}
                style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                onClick={
                  onRowClick
                    ? (event) => {
                        if ((event.target as HTMLElement).closest(INTERACTIVE)) return
                        onRowClick(row.original)
                      }
                    : undefined
                }
              >
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(density === 'compact' ? 'py-1.5' : 'py-2.5', alignRight.includes(cell.column.id) && 'text-right tabular font-medium')}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Row count footer */}
      {!loading && showCount && rows.length > 0 && (
        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-medium text-muted-foreground">
          <span>
            Showing <strong className="text-foreground font-semibold">{rows.length}</strong> {rows.length === 1 ? 'record' : 'records'}
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Click row to view details
          </span>
        </div>
      )}
    </div>
  )
}
