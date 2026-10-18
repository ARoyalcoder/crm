import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { FilterSelect, ListToolbar } from '@/components/list/ListControls'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate, formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { AMC_FREQUENCIES, AMC_STATUSES, amcContractsQuery, type AmcContractSummary, type AmcStatus } from '../api'
import { AmcStatusBadge } from '../components/AmcStatusBadge'
import { ExpiryIndicator } from '../components/ExpiryIndicator'
import { RenewalStatusBadge } from '../components/RenewalStatusBadge'

const column = dataTableColumns<AmcContractSummary>()

const columns = column.columns([
  column.accessor('contractNumber', {
    header: 'Contract',
    cell: ({ row }) => (
      <Link to={`/amc-contracts/${row.original.id}`} className="grid gap-0.5 underline-offset-2 hover:underline">
        <span className="font-mono text-sm font-medium">{row.original.contractNumber}</span>
        <span className="text-xs text-muted-foreground">{row.original.customerName ?? 'Customer not found'}</span>
      </Link>
    ),
  }),
  column.accessor('frequency', {
    header: 'Visits',
    cell: ({ getValue }) => AMC_FREQUENCIES.find((option) => option.value === getValue())?.label ?? getValue(),
  }),
  column.accessor('contractValue', {
    header: () => <span className="block text-right">Value</span>,
    cell: ({ row }) => <span className="block text-right tabular">{formatRupees(row.original.contractValue)}</span>,
  }),
  column.accessor('endDate', {
    header: 'Ends',
    cell: ({ row }) => (
      <span className="grid gap-0.5">
        <span className="whitespace-nowrap">{formatDate(row.original.endDate)}</span>
        <ExpiryIndicator endDate={row.original.endDate} />
      </span>
    ),
  }),
  column.accessor('status', { header: 'Status', cell: ({ getValue }) => <AmcStatusBadge status={getValue()} /> }),
  column.accessor('renewalStatus', { header: 'Renewal', cell: ({ getValue }) => <RenewalStatusBadge status={getValue()} /> }),
])

/** Every annual maintenance contract, with who it is with, what it is worth and when it ends. */
export function AmcListPage() {
  const params = useListParams()
  const canManage = useHasPermission('AMC_MANAGE')
  const status = params.get('status')
  const contracts = useQuery(amcContractsQuery({ status: (status || undefined) as AmcStatus | undefined, page: params.page, size: 20 }))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="AMC contracts"
        description="Annual maintenance contracts: customer, value and end date."
        action={
          canManage ? (
            <Button asChild>
              <Link to="/amc-contracts/new">
                <Plus aria-hidden="true" />
                New contract
              </Link>
            </Button>
          ) : null
        }
      />
      <AdminList
        noun="contracts"
        singular="contract"
        query={contracts}
        columns={columns}
        alignRight={['contractValue']}
        onPageChange={params.setPage}
        filtered={Boolean(status)}
        emptyAction={
          canManage ? (
            <Button asChild size="sm">
              <Link to="/amc-contracts/new">Create the first contract</Link>
            </Button>
          ) : undefined
        }
        toolbar={
          <ListToolbar onReset={status ? () => params.set('status', '') : undefined}>
            <FilterSelect label="Status" allLabel="Any status" value={status} onChange={(value) => params.set('status', value)} options={[...AMC_STATUSES]} />
          </ListToolbar>
        }
      />
    </div>
  )
}
