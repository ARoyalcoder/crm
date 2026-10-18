import { StatusBadge } from '@/components/shared/StatusBadge'

/** How far an application has got, from applied to hired or rejected. */
export function ApplicationStageBadge({ stage }: { stage: string }) {
  return <StatusBadge status={stage} domain="applicationStage" />
}
