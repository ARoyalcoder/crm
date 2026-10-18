import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { RecordLoadState } from '@/components/forms/FormParts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { auditLogQuery } from '@/features/audit/api'
import { AuditDetailContent } from '@/features/audit/components/AuditDetailDrawer'

const LIST = '/admin/audit'

/** One audit event in full: who, what, from where, and the values before and after. */
export function AuditLogDetailPage() {
  const { id = '' } = useParams()
  const detail = useQuery(auditLogQuery(id))

  return (
    <div className="grid gap-4 max-w-4xl">
      <PageHeader title="Audit Event" back={{ to: LIST, label: 'Audit log' }} />
      {detail.data ? (
        <Card className="p-6">
          <CardContent className="p-0">
            <AuditDetailContent detail={detail.data} />
          </CardContent>
        </Card>
      ) : (
        <RecordLoadState
          noun="audit event"
          isPending={detail.isPending}
          error={detail.error}
          onRetry={() => void detail.refetch()}
        />
      )}
    </div>
  )
}
