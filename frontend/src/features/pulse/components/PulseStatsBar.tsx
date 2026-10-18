import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { pulseStatsQuery } from '@/features/pulse/api'
import { insightLook } from '@/features/pulse/insight-look'
import { formatNumber } from '@/lib/format'

/** How many active insights there are of each kind, for the ones the signed-in person may see. */
export function PulseStatsBar() {
  const stats = useQuery(pulseStatsQuery())
  const data = stats.data
  const loading = stats.isPending
  const row = (type: string, count: number | undefined, hint: string) => {
    const look = insightLook(type)
    return <StatCard key={type} label={look.plural} icon={look.icon} tone={look.tone} loading={loading} value={formatNumber(count)} hint={hint} />
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Active insights by kind">
      {row('RISK', data?.risks, 'Things going wrong or about to')}
      {row('OPPORTUNITY', data?.opportunities, 'Chances worth taking')}
      {row('NEXT_BEST_ACTION', data?.actions, 'Suggested next steps')}
      {row('ACHIEVEMENT', data?.achievements, 'Wins to recognise')}
    </div>
  )
}
