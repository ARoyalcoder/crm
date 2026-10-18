import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/auth-context'
import { pulseKeys, pulseListQuery, refreshPulse, type PulseKind } from '@/features/pulse/api'
import { InsightList } from '@/features/pulse/components/InsightList'
import { PulseStatsBar } from '@/features/pulse/components/PulseStatsBar'

type Tab = 'all' | 'risks' | 'opportunities' | 'actions' | 'achievements'

const TABS: { id: Tab; label: string; empty: { title: string; description: string } }[] = [
  { id: 'all', label: 'All', empty: { title: 'Nothing needs attention right now', description: 'Insight engines read your records each morning. Anything worth a look shows up here.' } },
  { id: 'risks', label: 'Risks', empty: { title: 'No risks found', description: 'Nothing overdue, late, breached or lapsing needs attention.' } },
  { id: 'opportunities', label: 'Opportunities', empty: { title: 'No opportunities found', description: 'Leads and customers worth a conversation appear here.' } },
  { id: 'actions', label: 'Next actions', empty: { title: 'No suggested actions', description: 'Next steps appear here when a record is waiting on someone.' } },
  { id: 'achievements', label: 'Achievements', empty: { title: 'No achievements yet', description: 'Wins worth recognising, such as targets met and on-time deliveries, appear here.' } },
]

/** Everything Pawan Pulse found in the records the signed-in person may see, most urgent first. */
export function PulseFeedPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(0)
  // Only administrators may run the engines on demand (the API requires the same).
  const canRefresh = user?.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN') ?? false

  const kind: PulseKind = tab === 'all' ? 'feed' : tab
  const query = useQuery(pulseListQuery(kind, page))

  const refresh = useMutation({
    mutationFn: refreshPulse,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: pulseKeys.all }),
  })

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pawan Pulse"
        description="What needs attention: risks, chances, next steps and wins. You see only records you may open."
        action={
          canRefresh ? (
            <Button variant="outline" onClick={() => refresh.mutate()} loading={refresh.isPending}>
              <RefreshCw aria-hidden="true" />
              Refresh now
            </Button>
          ) : null
        }
      />

      <PulseStatsBar />

      <Tabs
        variant="line"
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab)
          setPage(0)
        }}
      >
        <TabsList aria-label="Kind of insight">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <InsightList query={query} page={page} onPageChange={setPage} empty={TABS.find((t) => t.id === tab)!.empty} />
    </div>
  )
}
