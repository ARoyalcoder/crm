import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTable, dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { useListParams } from '@/lib/use-list-params'
import { VENDOR_STATUSES, vendorsQuery, type Vendor } from '../api'
import { VendorStatusBadge } from '../components/VendorStatusBadge'

const PAGE_SIZE = 25
const column = dataTableColumns<Vendor>()

/** The suppliers and subcontractors the business buys from: who they are, how to reach them, and whether they can be used. */
export function VendorsPage() {
  const params = useListParams()
  const canCreate = useHasPermission('VENDOR_CREATE')
  const canUpdate = useHasPermission('VENDOR_UPDATE')
  const search = params.get('search')
  const status = params.get('status')
  const filtered = Boolean(search || status)
  const vendors = useQuery(vendorsQuery(status ? { status } : {}))

  const rows = useMemo(() => {
    const needle = search.toLowerCase()
    return (vendors.data ?? []).filter((vendor) => !needle || `${vendor.companyName} ${vendor.contactEmail} ${vendor.services ?? ''}`.toLowerCase().includes(needle))
  }, [vendors.data, search])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(params.page, pages - 1)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('companyName', {
          header: 'Vendor',
          cell: ({ row }) => (
            <Link to={`/vendors/${row.original.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
              <span className="font-medium">{row.original.companyName}</span>
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
        column.accessor('paymentTermsDays', { header: 'Payment terms', cell: ({ getValue }) => (getValue() != null ? `Net ${getValue()} days` : '—') }),
        column.accessor('status', { header: 'Status', cell: ({ getValue }) => <VendorStatusBadge status={getValue()} /> }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) =>
            canUpdate ? (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/vendors/${row.original.id}/edit`} aria-label={`Edit ${row.original.companyName}`}>
                    Edit
                  </Link>
                </Button>
              </div>
            ) : null,
        }),
      ]),
    [canUpdate],
  )

  const addVendor = (
    <Button asChild>
      <Link to="/vendors/new">
        <Plus aria-hidden="true" />
        Add vendor
      </Link>
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader title="Vendors" description="Suppliers and subcontractors: contacts and status." action={canCreate ? addVendor : null} />
      <Card>
        <CardContent className="grid gap-4">
          <ListToolbar onReset={filtered ? () => params.setMany({ search: '', status: '' }) : undefined}>
            <SearchInput label="Search vendors" value={search} onChange={(value) => params.set('search', value)} />
            <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(value) => params.set('status', value)} options={[...VENDOR_STATUSES]} />
          </ListToolbar>
          {vendors.isPending ? (
            <SkeletonLoader variant="table" label="Loading vendors" />
          ) : vendors.isError ? (
            <ErrorState title="Could not load the vendors" error={vendors.error} onRetry={() => void vendors.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
                caption="Vendors"
                empty={
                  <EmptyState
                    variant="compact"
                    icon={Truck}
                    title={filtered ? 'No vendor matches' : 'No vendors yet'}
                    description={filtered ? 'Try another search or clear filters.' : undefined}
                    action={filtered || !canCreate ? undefined : addVendor}
                  />
                }
              />
              <Pagination page={page} totalPages={pages} totalItems={rows.length} noun="vendors" singular="vendor" onPageChange={params.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
