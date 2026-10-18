import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ActivityTimeline, type ActivityItem } from '@/components/shared/ActivityTimeline'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { documentVersionsQuery } from '../api'
import { formatFileSize } from './formatFileSize'

type DocumentVersionHistoryProps = {
  documentId: string
  documentTitle: string
  onClose: () => void
}

/** Every file a document has had, newest first, with who uploaded it and why. */
export function DocumentVersionHistory({ documentId, documentTitle, onClose }: DocumentVersionHistoryProps) {
  const versions = useQuery(documentVersionsQuery(documentId))

  const items: ActivityItem[] = [...(versions.data ?? [])]
    .sort((a, b) => b.versionNumber - a.versionNumber)
    .map((version) => ({
      id: version.id,
      title: `Version ${version.versionNumber}: ${version.originalFileName}`,
      description: [formatFileSize(version.fileSizeBytes), version.notes ? `Replaced: ${version.notes}` : null].filter(Boolean).join(' · '),
      actor: version.uploadedByName ?? 'a former user',
      at: version.uploadedAt,
      tone: 'info',
    }))

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent side="right">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Version history</DialogTitle>
          <DialogDescription className="truncate">{documentTitle}</DialogDescription>
        </DialogHeader>
        {versions.isPending ? (
          <SkeletonLoader variant="list" count={3} label="Loading the versions" />
        ) : versions.isError ? (
          <ErrorState title="Could not load the versions" error={versions.error} onRetry={() => void versions.refetch()} />
        ) : (
          <ActivityTimeline items={items} label="Versions of this document" emptyTitle="No earlier versions" emptyDescription="This is the original file." />
        )}
      </DialogContent>
    </Dialog>
  )
}
