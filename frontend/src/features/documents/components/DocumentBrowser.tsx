import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, FolderOpen, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { entityPath } from '@/lib/entity-links'
import { formatDate } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { DOCUMENT_CATEGORIES, DOCUMENT_ENTITY_TYPES, deleteDocument, documentKeys, labelOf, type DocumentListItem } from '../api'
import { DocumentFileIcon } from './DocumentFileIcon'
import { formatFileSize } from './formatFileSize'
import { useDocumentDownload } from './use-document-download'

const PAGE_SIZE = 25
const column = dataTableColumns<DocumentListItem>()

type DocumentBrowserProps = {
  documents: DocumentListItem[]
  /** What the list is of, for messages: "documents" or "your documents". */
  noun: string
  /** The person may delete documents (DOCUMENT_DELETE). */
  canDelete: boolean
  /** Shown when there are no documents at all. */
  emptyDescription: string
}

/** A searchable, filterable list of documents with download and (for those who may) delete. */
export function DocumentBrowser({ documents, noun, canDelete, emptyDescription }: DocumentBrowserProps) {
  const params = useListParams()
  const queryClient = useQueryClient()
  const { download, pendingId, error: downloadError } = useDocumentDownload()
  const [removing, setRemoving] = useState<DocumentListItem | null>(null)

  const search = params.get('search')
  const type = params.get('type')
  const category = params.get('category')
  const filtered = Boolean(search || type || category)

  const remove = useMutation({
    mutationFn: (document: DocumentListItem) => deleteDocument(document.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
      setRemoving(null)
    },
    onError: () => setRemoving(null),
  })

  const rows = useMemo(() => {
    const needle = search.toLowerCase()
    return documents.filter(
      (document) =>
        (!type || document.entityType === type) &&
        (!category || document.category === category) &&
        (!needle || `${document.title} ${document.originalFileName}`.toLowerCase().includes(needle)),
    )
  }, [documents, search, type, category])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(params.page, pages - 1)
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('title', {
          header: 'Document',
          cell: ({ row }) => (
            <span className="flex items-center gap-3">
              <DocumentFileIcon mimeType={row.original.mimeType} />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium">{row.original.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.original.originalFileName}
                  {row.original.documentVersion > 1 ? ` · version ${row.original.documentVersion}` : ''}
                </span>
              </span>
            </span>
          ),
        }),
        column.accessor('entityType', {
          header: 'Attached to',
          cell: ({ row }) => {
            const href = entityPath(row.original.entityType, row.original.entityId)
            const label = labelOf(DOCUMENT_ENTITY_TYPES, row.original.entityType)
            return href ? (
              <Link to={href} className="underline-offset-2 hover:underline">
                {label}
              </Link>
            ) : (
              label
            )
          },
        }),
        column.accessor('category', { header: 'Category', cell: ({ getValue }) => <Badge variant="neutral">{labelOf(DOCUMENT_CATEGORIES, getValue())}</Badge> }),
        column.accessor('fileSizeBytes', {
          header: () => <span className="block text-right">Size</span>,
          cell: ({ getValue }) => <span className="block text-right tabular text-muted-foreground">{formatFileSize(getValue())}</span>,
        }),
        column.accessor('createdAt', {
          header: 'Uploaded',
          cell: ({ row }) => (
            <span className="grid gap-0.5">
              <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
              <span className="truncate text-xs text-muted-foreground">{row.original.uploadedByName ?? 'Former user'}</span>
            </span>
          ),
        }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="outline" size="sm" aria-label={`Download ${row.original.title}`} loading={pendingId === row.original.id} onClick={() => void download(row.original.id, row.original.title)}>
                <Download aria-hidden="true" />
                Download
              </Button>
              {canDelete ? (
                <Button variant="ghost" size="icon" aria-label={`Delete ${row.original.title}`} onClick={() => setRemoving(row.original)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ),
        }),
      ]),
    [canDelete, download, pendingId],
  )

  return (
    <Card>
      <CardContent className="grid gap-4">
        <ListToolbar onReset={filtered ? () => params.setMany({ search: '', type: '', category: '' }) : undefined}>
          <SearchInput label={`Search ${noun}`} value={search} onChange={(value) => params.set('search', value)} />
          <FilterSelect label="Attached to" allLabel="Any record" value={type} onChange={(value) => params.set('type', value)} options={[...DOCUMENT_ENTITY_TYPES]} />
          <FilterSelect label="Category" allLabel="Any category" value={category} onChange={(value) => params.set('category', value)} options={[...DOCUMENT_CATEGORIES]} />
        </ListToolbar>

        {downloadError ? <ErrorState title="That file could not be opened" message={downloadError} variant="compact" /> : null}
        {remove.isError ? <ErrorState title="That document could not be deleted" error={remove.error} variant="compact" /> : null}

        <DataTable
          columns={columns}
          data={visible}
          caption={`Documents, ${noun}`}
          alignRight={['fileSizeBytes']}
          empty={
            <EmptyState
              variant="compact"
              icon={FolderOpen}
              title={filtered ? 'No document matches' : `No ${noun} yet`}
              description={filtered ? 'Try another search or clear filters.' : emptyDescription}
            />
          }
        />
        <Pagination page={page} totalPages={pages} totalItems={rows.length} noun="documents" singular="document" onPageChange={params.setPage} />
      </CardContent>

      <ConfirmationDialog
        open={removing !== null}
        onOpenChange={(open) => (open ? undefined : setRemoving(null))}
        title="Delete this document?"
        description={removing ? `“${removing.title}” and its earlier versions will be deleted.` : undefined}
        confirmLabel="Delete document"
        destructive
        pending={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
      />
    </Card>
  )
}
