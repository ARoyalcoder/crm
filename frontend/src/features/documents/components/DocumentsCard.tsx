import { Card, CardContent } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { DocumentList } from './DocumentList'

/** The documents of one record in a card, for record pages. People who may not see documents do not see the card. */
export function DocumentsCard({ entityType, entityId }: { entityType: string; entityId: string }) {
  const allowed = useHasPermission('DOCUMENT_VIEW')
  if (!allowed) return null
  return (
    <Card>
      <CardContent>
        <DocumentList entityType={entityType} entityId={entityId} />
      </CardContent>
    </Card>
  )
}
