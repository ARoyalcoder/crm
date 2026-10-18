import { StatusBadge } from '@/components/shared/StatusBadge'

/** How far a partner organisation may see into the business. */
export function PartnerAccessBadge({ accessLevel }: { accessLevel: string }) {
  return <StatusBadge status={accessLevel} domain="partnerAccess" plain />
}
