import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Handshake, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTable, dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useListParams } from '@/lib/use-list-params'
import { partnersQuery, type Partner } from '../api'
import { PartnerAccessBadge } from '../components/PartnerAccessBadge'

const PAGE_SIZE = 25
const column = dataTableColumns<Partner>()

const columns = column.columns([
  column.accessor('organizationName', {
    header: 'Partner',
    cell: ({ row }) => (
      <Link to={`/partners/${row.original.id}/edit`} className="grid gap-0.5 underline-offset-2 hover:underline">
        <span className="font-medium">{row.original.organizationName}</span>
        {row.original.services ? <span className="max-w-xs truncate text-xs text-muted-foreground">{row.original.services}</span> : null}
      </Link>
    ),
  }),
  column.accessor('contactEmail', {
    header: 'Contact',
    cell: ({ row }) => (
      <span className="grid gap-0.5">
        <span>{row.original.contactEmail}</span>
        <span className="text-xs text-muted-foreground">{row.original.contactPhone}</span>
      </span>
    ),
  }),
  column.accessor('accessLevel', { header: 'May see', cell: ({ getValue }) => <PartnerAccessBadge accessLevel={getValue()} /> }),
  column.accessor('active', { header: 'Status', cell: ({ getValue }) => <StatusBadge active={getValue()} /> }),
])

/** Partner organisations that are given limited access to the system, and how much. */
export function PartnersPage() {
  const params = useListParams()
  const search = params.get('search')
  const partners = useQuery(partnersQuery())

  const rows = useMemo(() => {
    const needle = search.toLowerCase()
    return (partners.data ?? []).filter((partner) => !needle || `${partner.organizationName} ${partner.contactEmail} ${partner.services ?? ''}`.toLowerCase().includes(needle))
  }, [partners.data, search])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(params.page, pages - 1)

  const addPartner = (
    <Button asChild>
      <Link to="/partners/new">
        <Plus aria-hidden="true" />
        Add partner
      </Link>
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader title="Partners" description="Outside organisations with limited access, never unrestricted access to the business." action={addPartner} />
      <Card>
        <CardContent className="grid gap-4">
          <ListToolbar onReset={search ? () => params.set('search', '') : undefined}>
            <SearchInput label="Search partners" value={search} onChange={(value) => params.set('search', value)} />
          </ListToolbar>
          {partners.isPending ? (
            <SkeletonLoader variant="table" label="Loading partners" />
          ) : partners.isError ? (
            <ErrorState title="Could not load the partners" error={partners.error} onRetry={() => void partners.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
                caption="Partners"
                empty={<EmptyState variant="compact" icon={Handshake} title={search ? 'No partner matches' : 'No partners yet'} description={search ? 'Try a different search.' : undefined} action={search ? undefined : addPartner} />}
              />
              <Pagination page={page} totalPages={pages} totalItems={rows.length} noun="partners" singular="partner" onPageChange={params.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
