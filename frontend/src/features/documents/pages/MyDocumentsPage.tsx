import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { useHasPermission } from '@/features/auth/auth-context'
import { myDocumentsQuery } from '../api'
import { DocumentBrowser } from '../components/DocumentBrowser'

/** The documents you have uploaded yourself. */
export function MyDocumentsPage() {
  const canDelete = useHasPermission('DOCUMENT_DELETE')
  const documents = useQuery(myDocumentsQuery())

  return (
    <div className="grid gap-4">
      <PageHeader title="My documents" description="Everything you uploaded, wherever it is filed." />
      {documents.isPending ? (
        <SkeletonLoader variant="table" label="Loading your documents" />
      ) : documents.isError ? (
        <ErrorState title="Could not load your documents" error={documents.error} onRetry={() => void documents.refetch()} />
      ) : (
        <DocumentBrowser documents={documents.data} noun="your documents" canDelete={canDelete} emptyDescription="Nothing uploaded yet." />
      )}
    </div>
  )
}
