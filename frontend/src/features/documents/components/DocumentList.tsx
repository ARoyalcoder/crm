import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileUp, FolderOpen, History, Trash2, Upload } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'
import { DOCUMENT_CATEGORIES, deleteDocument, documentKeys, documentsByEntityQuery, labelOf, type DocumentRecord } from '../api'
import { DocumentFileIcon } from './DocumentFileIcon'
import { DocumentUploadModal } from './DocumentUploadModal'
import { DocumentVersionHistory } from './DocumentVersionHistory'
import { formatFileSize } from './formatFileSize'
import { NewVersionModal } from './NewVersionModal'
import { useDocumentDownload } from './use-document-download'

type DocumentListProps = {
  /** What the documents are attached to, e.g. `CUSTOMER`. */
  entityType: string
  /** The record they are attached to. */
  entityId: string
  /** Overrides the person's upload permission (DOCUMENT_UPLOAD), e.g. to make an embed read-only. */
  canUpload?: boolean
  /** Overrides the person's delete permission (DOCUMENT_DELETE). */
  canDelete?: boolean
}

/**
 * The documents filed against one record, with upload, download, new versions and (for those who may) delete.
 * Drop it into a record's page: `<DocumentList entityType="PROJECT" entityId={project.id} />`.
 */
export function DocumentList({ entityType, entityId, canUpload, canDelete }: DocumentListProps) {
  const queryClient = useQueryClient()
  const mayUpload = useHasPermission('DOCUMENT_UPLOAD')
  const mayDelete = useHasPermission('DOCUMENT_DELETE')
  const uploadAllowed = canUpload ?? mayUpload
  const deleteAllowed = canDelete ?? mayDelete
  const { download, pendingId, error: downloadError } = useDocumentDownload()

  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState<DocumentRecord | null>(null)
  const [revising, setRevising] = useState<DocumentRecord | null>(null)
  const [removing, setRemoving] = useState<DocumentRecord | null>(null)

  const documents = useQuery(documentsByEntityQuery(entityType, entityId))

  const remove = useMutation({
    mutationFn: (document: DocumentRecord) => deleteDocument(document.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
      setRemoving(null)
    },
    onError: () => setRemoving(null),
  })

  const upload = (
    <Button size="sm" onClick={() => setUploading(true)}>
      <Upload aria-hidden="true" />
      Upload
    </Button>
  )

  return (
    <section aria-labelledby={`documents-${entityId}`} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`documents-${entityId}`} className="text-base font-semibold tracking-tight">
          Documents{documents.data && documents.data.length > 0 ? ` (${documents.data.length})` : ''}
        </h2>
        {uploadAllowed ? upload : null}
      </div>

      {downloadError ? <ErrorState title="That file could not be opened" message={downloadError} variant="compact" /> : null}
      {remove.isError ? <ErrorState title="That document could not be deleted" error={remove.error} variant="compact" /> : null}

      {documents.isPending ? (
        <SkeletonLoader variant="list" count={3} label="Loading documents" />
      ) : documents.isError ? (
        <ErrorState title="Could not load the documents" error={documents.error} onRetry={() => void documents.refetch()} />
      ) : documents.data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents yet"
          description={uploadAllowed ? 'Upload contracts, drawings, reports or anything else for this record.' : 'Nothing filed against this record.'}
          action={uploadAllowed ? upload : undefined}
        />
      ) : (
        <ul className="grid gap-3">
          {documents.data.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
              <div className="flex min-w-0 items-center gap-3">
                <DocumentFileIcon mimeType={document.mimeType} />
                <div className="grid min-w-0 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{document.title}</span>
                    <Badge variant="neutral">{labelOf(DOCUMENT_CATEGORIES, document.category)}</Badge>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {document.originalFileName} · {formatFileSize(document.fileSizeBytes)} · {formatDate(document.createdAt)} by {document.uploadedByName ?? 'a former user'}
                  </span>
                  {document.description ? <span className="text-xs text-muted-foreground">{document.description}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {document.documentVersion > 1 ? (
                  <Button variant="ghost" size="sm" aria-label={`Version history of ${document.title}`} onClick={() => setHistory(document)}>
                    <History aria-hidden="true" />v{document.documentVersion}
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" aria-label={`Download ${document.title}`} loading={pendingId === document.id} onClick={() => void download(document.id, document.title)}>
                  <Download aria-hidden="true" />
                  Download
                </Button>
                {uploadAllowed ? (
                  <Button variant="ghost" size="icon" aria-label={`Upload a new version of ${document.title}`} onClick={() => setRevising(document)}>
                    <FileUp aria-hidden="true" />
                  </Button>
                ) : null}
                {deleteAllowed ? (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${document.title}`} onClick={() => setRemoving(document)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {uploading ? <DocumentUploadModal entityType={entityType} entityId={entityId} onClose={() => setUploading(false)} /> : null}
      {history ? <DocumentVersionHistory documentId={history.id} documentTitle={history.title} onClose={() => setHistory(null)} /> : null}
      {revising ? <NewVersionModal documentId={revising.id} documentTitle={revising.title} currentVersion={revising.documentVersion} onClose={() => setRevising(null)} /> : null}
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
    </section>
  )
}
