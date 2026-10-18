import { useQuery } from '@tanstack/react-query'
import { Files, HardDrive } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatNumber } from '@/lib/format'
import { allDocumentsQuery, storageSummaryQuery } from '../api'
import { DocumentBrowser } from '../components/DocumentBrowser'
import { formatFileSize } from '../components/formatFileSize'

/** Every document filed against the business's records. Files are added from the record they belong to. */
export function DocumentsPage() {
  const canDelete = useHasPermission('DOCUMENT_DELETE')
  const documents = useQuery(allDocumentsQuery())
  const summary = useQuery(storageSummaryQuery())

  return (
    <div className="grid gap-4">
      <PageHeader title="Documents" description="Contracts, proposals, drawings and reports. To add one, open its record and use Documents." />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Files" icon={Files} loading={summary.isPending} value={summary.data ? formatNumber(summary.data.totalFiles) : '—'} hint="Across every record" />
        <StatCard label="Storage used" icon={HardDrive} loading={summary.isPending} value={summary.data ? formatFileSize(summary.data.totalSizeBytes) : '—'} hint="Current versions and earlier ones" />
      </div>

      {documents.isPending ? (
        <SkeletonLoader variant="table" label="Loading documents" />
      ) : documents.isError ? (
        <ErrorState title="Could not load the documents" error={documents.error} onRetry={() => void documents.refetch()} />
      ) : (
        <DocumentBrowser documents={documents.data} noun="documents" canDelete={canDelete} emptyDescription="Nothing filed yet." />
      )}
    </div>
  )
}
