import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { pulseOpportunitiesQuery } from '@/features/pulse/api'
import { InsightList } from '@/features/pulse/components/InsightList'

/** Only the opportunities: leads and customers worth a conversation, most promising first. */
export function PulseOpportunitiesPage() {
  const [page, setPage] = useState(0)
  const query = useQuery(pulseOpportunitiesQuery(page))
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Opportunities"
        back={{ to: '/pulse', label: 'Pawan Pulse' }}
        description="Chances in your records: hot leads, customers ready to renew or buy again. Only records you may see."
      />
      <InsightList
        query={query}
        page={page}
        onPageChange={setPage}
        empty={{ title: 'No opportunities found', description: 'Leads and customers worth a conversation appear here.' }}
      />
    </div>
  )
}
