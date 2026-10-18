import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { dataTableColumns } from '@/components/data-table/DataTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdminList } from '@/components/list/AdminList'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { deleteWarranty, warrantiesQuery, warrantyKeys, type WarrantySummary } from '../api'
import { ExpiryIndicator } from '../components/ExpiryIndicator'
import { WarrantyDialog } from '../components/WarrantyDialog'

const column = dataTableColumns<WarrantySummary>()

/** Every warranty the business has given, who it is for, and whether it is still in force. */
export function WarrantiesPage() {
  const params = useListParams()
  const queryClient = useQueryClient()
  const canManage = useHasPermission('WARRANTY_MANAGE')
  const warranties = useQuery(warrantiesQuery({ page: params.page, size: 20 }))

  // `undefined`: no dialog. `null`: a new warranty. A record: that warranty being edited.
  const [editing, setEditing] = useState<WarrantySummary | null | undefined>(undefined)
  const [removing, setRemoving] = useState<WarrantySummary | null>(null)

  const remove = useMutation({
    mutationFn: (warranty: WarrantySummary) => deleteWarranty(warranty.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: warrantyKeys.all })
      setRemoving(null)
    },
    onError: () => setRemoving(null),
  })

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('description', {
          header: 'Warranty',
          cell: ({ row }) => (
            <span className="grid gap-0.5">
              <span className="font-medium">{row.original.description}</span>
              <span className="text-xs text-muted-foreground">{row.original.customerName ?? 'Customer not found'}</span>
            </span>
          ),
        }),
        column.accessor('startDate', { header: 'Starts', cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDate(getValue())}</span> }),
        column.accessor('endDate', {
          header: 'Ends',
          cell: ({ row }) => (
            <span className="grid gap-0.5">
              <span className="whitespace-nowrap">{formatDate(row.original.endDate)}</span>
              {row.original.status === 'ACTIVE' ? <ExpiryIndicator endDate={row.original.endDate} /> : null}
            </span>
          ),
        }),
        column.accessor('status', { header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue()} /> }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) =>
            canManage ? (
              <div className="flex justify-end gap-1">
                <Button variant="outline" size="sm" aria-label={`Edit ${row.original.description}`} onClick={() => setEditing(row.original)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Delete ${row.original.description}`} onClick={() => setRemoving(row.original)}>
                  Delete
                </Button>
              </div>
            ) : null,
        }),
      ]),
    [canManage],
  )

  const newWarranty = (
    <Button onClick={() => setEditing(null)}>
      <Plus aria-hidden="true" />
      New warranty
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Warranties"
        description="Each customer's coverage, and for how long."
        action={canManage ? newWarranty : null}
      />
      <AdminList
        noun="warranties"
        singular="warranty"
        query={warranties}
        columns={columns}
        onPageChange={params.setPage}
        actionError={remove.error}
        emptyAction={canManage ? newWarranty : undefined}
        toolbar={null}
      />

      {editing !== undefined ? <WarrantyDialog warranty={editing} onClose={() => setEditing(undefined)} /> : null}
      <ConfirmationDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title="Delete this warranty?"
        description={removing ? `“${removing.description}” will be deleted. To keep the record, void it instead.` : undefined}
        confirmLabel="Delete warranty"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </div>
  )
}
