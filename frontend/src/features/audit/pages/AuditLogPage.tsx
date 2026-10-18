import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { FilterSelect, ListToolbar, SearchInput } from '@/components/list/ListControls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AUDIT_ACTIONS,
  auditFacetsQuery,
  auditLogsQuery,
  dayEnd,
  dayStart,
  formatDateTime,
  type AuditEntry,
} from '@/features/audit/api'
import { ActionBadge } from '@/features/audit/components/ActionBadge'
import { AuditDetailDrawer } from '@/features/audit/components/AuditDetailDrawer'
import { useListParams } from '@/lib/use-list-params'

const column = dataTableColumns<AuditEntry>()

/**
 * Audit log page: high-density, neat list with minimal text on rows.
 * Clicking a row or the "Detail" button opens a slide-over sheet showing every data point.
 */
export function AuditLogPage() {
  const params = useListParams()
  const facets = useQuery(auditFacetsQuery)
  const fromDate = params.get('from')
  const toDate = params.get('to')
  const [selectedId, setSelectedId] = useState<string | null>(params.get('selected') || null)

  const logs = useQuery(
    auditLogsQuery({
      search: params.get('search'),
      actorId: params.get('actorId'),
      module: params.get('module'),
      action: params.get('action'),
      entityType: params.get('entityType'),
      entityId: params.get('entityId'),
      from: dayStart(fromDate),
      to: dayEnd(toDate),
      page: params.page,
    }),
  )

  const columns = useMemo(
    () => [
      column.accessor('occurredAt', {
        header: 'Time',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap tabular-nums text-xs font-medium text-muted-foreground">
            {formatDateTime(getValue())}
          </span>
        ),
      }),
      column.accessor('actorLabel', {
        header: 'User',
        cell: ({ getValue }) => {
          const name = getValue() || 'System'
          const initial = name.charAt(0).toUpperCase()
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {initial}
              </span>
              <span className="truncate text-xs font-medium text-foreground max-w-[120px]">
                {name}
              </span>
            </div>
          )
        },
      }),
      column.accessor('action', {
        header: 'Action',
        cell: ({ getValue }) => <ActionBadge action={getValue()} />,
      }),
      column.display({
        id: 'target',
        header: 'Target',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs">
            <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-muted font-medium capitalize text-foreground text-[11px]">
              {row.original.module}
            </span>
            {row.original.entityType && (
              <span className="text-muted-foreground text-[11px] truncate max-w-[110px]">
                / {row.original.entityType}
              </span>
            )}
          </div>
        ),
      }),
      column.accessor('summary', {
        header: 'Summary',
        cell: ({ row }) => (
          <span
            className="block max-w-[260px] truncate text-xs text-foreground/85 lg:max-w-[420px]"
            title={row.original.summary}
          >
            {row.original.summary}
          </span>
        ),
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Details</span>,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-2xs"
              onClick={() => setSelectedId(row.original.id)}
            >
              <Eye className="size-3.5" />
              Detail
            </Button>
          </div>
        ),
      }),
    ],
    [],
  )

  const filtersActive = ['search', 'actorId', 'module', 'action', 'entityType', 'entityId', 'from', 'to'].some(
    (key) => params.get(key) !== '',
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Audit Log"
        description="Every change, sign-in and sensitive action, newest first."
      />

      <AdminList
        noun="events"
        singular="event"
        query={logs}
        columns={columns}
        onRowClick={(row) => setSelectedId(row.id)}
        onPageChange={params.setPage}
        toolbar={
          <ListToolbar>
            <SearchInput
              label="Search audit log"
              value={params.get('search')}
              onChange={(value) => params.set('search', value)}
            />
            <FilterSelect
              label="User"
              allLabel="All users"
              value={params.get('actorId')}
              onChange={(value) => params.set('actorId', value)}
              options={(facets.data?.actors ?? []).map((actor) => ({ value: actor.id, label: actor.label }))}
            />
            <FilterSelect
              label="Module"
              allLabel="All modules"
              value={params.get('module')}
              onChange={(value) => params.set('module', value)}
              options={(facets.data?.modules ?? []).map((module) => ({
                value: module,
                label: module.charAt(0).toUpperCase() + module.slice(1),
              }))}
            />
            <FilterSelect
              label="Action"
              allLabel="All actions"
              value={params.get('action')}
              onChange={(value) => params.set('action', value)}
              options={AUDIT_ACTIONS.map((action) => ({ value: action.value, label: action.label }))}
            />
            <FilterSelect
              label="Entity"
              allLabel="All entities"
              value={params.get('entityType')}
              onChange={(value) => params.setMany({ entityType: value, entityId: '' })}
              options={(facets.data?.entityTypes ?? []).map((type) => ({ value: type, label: type }))}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              From
              <Input
                type="date"
                aria-label="From date"
                className="sm:w-36"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => params.set('from', event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              To
              <Input
                type="date"
                aria-label="To date"
                className="sm:w-36"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => params.set('to', event.target.value)}
              />
            </label>
            {params.get('entityId') ? (
              <span className="rounded-md border px-2 py-1 font-mono text-xs">record {params.get('entityId')}</span>
            ) : null}
            {filtersActive ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  params.setMany({
                    search: '',
                    actorId: '',
                    module: '',
                    action: '',
                    entityType: '',
                    entityId: '',
                    from: '',
                    to: '',
                  })
                }
              >
                Clear filters
              </Button>
            ) : null}
          </ListToolbar>
        }
      />

      {/* Slide-over Inspector Drawer for Full Data View */}
      <AuditDetailDrawer
        id={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  )
}
