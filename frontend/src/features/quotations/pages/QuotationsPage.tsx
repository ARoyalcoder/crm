import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { FilterSelect, ListToolbar, SearchInput } from '@/components/list/ListControls'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate, formatRupees, isoDate } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { QUOTATION_STATUSES, quotationDashboardQuery, quotationKeys, quotationsQuery, type QuotationSummary } from '../api'
import { QuotationDashboardOverview } from '../components/QuotationDashboardOverview'
import { QuotationModal } from '../components/QuotationModal'
import { QuotationStatusBadge } from '../components/QuotationStatusBadge'

const column = dataTableColumns<QuotationSummary>()

const columns = column.columns([
  column.accessor('quotationNumber', {
    header: 'Quotation',
    cell: ({ row }) => (
      <Link to={`/quotations/${row.original.id}`} className="font-medium underline-offset-2 hover:underline">
        {row.original.title}
      </Link>
    ),
  }),
  column.accessor((quotation) => quotation.customerName ?? quotation.leadName ?? '', {
    id: 'for',
    header: 'For',
    cell: ({ row }) => <span>{row.original.customerName ?? row.original.leadName ?? 'Not linked'}</span>,
  }),
  column.accessor('status', { header: 'Status', cell: ({ getValue }) => <QuotationStatusBadge status={getValue()} /> }),
  column.accessor('finalAmount', {
    header: () => <span className="block text-right">Value</span>,
    cell: ({ row }) => <span className="block text-right tabular">{formatRupees(row.original.finalAmount, { exact: true })}</span>,
  }),
  column.accessor('nextFollowUpDate', { header: 'Follow up', cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span> }),
  column.accessor('ownerName', { header: 'Owner' }),
])

/** Every quotation: the figures on top, then a searchable list. New ones are written here. */
export function QuotationsPage() {
  const params = useListParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const canCreate = useHasPermission('QUOTATION_CREATE')
  const [creating, setCreating] = useState(false)

  const search = params.get('search')
  const status = params.get('status')
  const followUp = params.get('followUp')
  const filtered = Boolean(search || status || followUp)

  const dashboard = useQuery(quotationDashboardQuery())
  const quotations = useQuery(
    quotationsQuery({
      filters: { status: status || null, search: search || null, followUpDate: followUp === 'today' ? isoDate(new Date()) : null },
      page: params.page,
      size: 20,
      sort: 'createdAt,desc',
    }),
  )

  const newQuotation = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden="true" />
      New quotation
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Quotations"
        description="Price proposals: written, approved, sent, and turned into orders when accepted."
        action={canCreate ? newQuotation : null}
      />

      {dashboard.isPending ? <SkeletonLoader variant="kpis" count={8} label="Loading quotation figures" /> : dashboard.data ? <QuotationDashboardOverview dashboard={dashboard.data} /> : null}

      <AdminList
        noun="quotations"
        singular="quotation"
        query={quotations}
        columns={columns}
        alignRight={['finalAmount']}
        onPageChange={params.setPage}
        filtered={filtered}
        emptyAction={canCreate ? newQuotation : undefined}
        toolbar={
          <ListToolbar onReset={filtered ? () => params.setMany({ search: '', status: '', followUp: '' }) : undefined}>
            <SearchInput label="Search quotations" value={search} onChange={(value) => params.set('search', value)} />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={(value) => params.set('status', value)}
              options={QUOTATION_STATUSES.map(({ value, label }) => ({ value, label }))}
            />
            {followUp === 'today' ? <span className="text-sm text-muted-foreground">Showing follow-ups due today</span> : null}
          </ListToolbar>
        }
      />

      {creating ? (
        <QuotationModal
          open
          onOpenChange={setCreating}
          onSuccess={(created) => {
            void queryClient.invalidateQueries({ queryKey: quotationKeys.all })
            navigate(`/quotations/${created.id}`)
          }}
        />
      ) : null}
    </div>
  )
}
