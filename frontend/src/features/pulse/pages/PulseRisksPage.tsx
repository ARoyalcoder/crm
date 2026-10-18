import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { pulseRisksQuery } from '@/features/pulse/api'
import { InsightList } from '@/features/pulse/components/InsightList'

/** Only the risks: overdue money, late projects, breached tickets, lapsing contracts and cold leads, most urgent first. */
export function PulseRisksPage() {
  const [page, setPage] = useState(0)
  const query = useQuery(pulseRisksQuery(page))
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Risks"
        back={{ to: '/pulse', label: 'Pawan Pulse' }}
        description="Active risks across leads, invoices, projects, tickets and AMC contracts you may see."
      />
      <InsightList
        query={query}
        page={page}
        onPageChange={setPage}
        empty={{ title: 'No risks found', description: 'Nothing overdue, late, breached or lapsing needs attention.' }}
      />
    </div>
  )
}
