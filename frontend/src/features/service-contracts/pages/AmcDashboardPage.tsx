import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, FileCheck2, Plus, RefreshCw, Shield, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatDate, formatNumber } from '@/lib/format'
import { amcDashboardQuery } from '../api'
import { AmcStatusBadge } from '../components/AmcStatusBadge'
import { ExpiryIndicator } from '../components/ExpiryIndicator'
import { RenewalStatusBadge } from '../components/RenewalStatusBadge'
import { ServiceVisitCard } from '../components/ServiceVisitCard'

/** Contracts at a glance: how many are running, which are about to end, and the visits coming up. */
export function AmcDashboardPage() {
  const canManage = useHasPermission('AMC_MANAGE')
  const query = useQuery(amcDashboardQuery())
  const data = query.data

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Service contracts"
        description="Maintenance contracts and visits: what is running, ending soon and due."
        action={
          canManage ? (
            <Button asChild>
              <Link to="/amc-contracts/new">
                <Plus aria-hidden="true" />
                New contract
              </Link>
            </Button>
          ) : null
        }
      />

      {query.isPending ? (
        <>
          <SkeletonLoader variant="kpis" label="Loading contracts" />
          <SkeletonLoader variant="card" height={240} />
        </>
      ) : query.isError || !data ? (
        <ErrorState title="Could not load the contracts overview" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active contracts" icon={FileCheck2} tone="success" value={formatNumber(data.totalActive)} hint="In force today" href="/amc-contracts?status=ACTIVE" />
            <StatCard
              label="Ending within 30 days"
              icon={TriangleAlert}
              tone={data.expiringSoon > 0 ? 'warning' : 'success'}
              value={formatNumber(data.expiringSoon)}
              hint="Worth a renewal conversation"
              href="/amc-contracts"
            />
            <StatCard
              label="Renewals overdue"
              icon={RefreshCw}
              tone={data.overdueRenewals > 0 ? 'danger' : 'success'}
              value={formatNumber(data.overdueRenewals)}
              hint="Waiting to be renewed"
              href="/amc-contracts?status=RENEWAL_PENDING"
            />
            <StatCard label="Visits coming up" icon={CalendarCheck} tone="info" value={formatNumber(data.upcomingVisits)} hint="In the next 30 days" />
          </div>

          {data.expiringSoonContracts.length > 0 ? (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Ending soon</CardTitle>
                <CardAction>
                  <Link to="/amc-contracts" className="text-sm font-medium text-primary hover:underline">
                    All contracts
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <ul className="divide-y">
                  {data.expiringSoonContracts.map((contract) => (
                    <li key={contract.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
                      <div className="grid gap-0.5">
                        <Link to={`/amc-contracts/${contract.id}`} className="text-sm font-medium underline-offset-2 hover:underline">
                          <span className="font-mono">{contract.contractNumber}</span>
                          {contract.customerName ? <span className="font-sans"> · {contract.customerName}</span> : null}
                        </Link>
                        <p className="text-xs text-muted-foreground">Ends {formatDate(contract.endDate)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <ExpiryIndicator endDate={contract.endDate} />
                        <AmcStatusBadge status={contract.status} />
                        <RenewalStatusBadge status={contract.renewalStatus} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {data.upcomingVisitsList.length > 0 ? (
            <section aria-labelledby="visits-heading" className="grid gap-3">
              <h2 id="visits-heading" className="text-base font-semibold tracking-tight">
                Service visits in the next 30 days
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {data.upcomingVisitsList.map((visit) => (
                  <ServiceVisitCard key={visit.id} visit={visit} showContract />
                ))}
              </div>
            </section>
          ) : null}

          {data.upcomingVisitsList.length === 0 && data.expiringSoonContracts.length === 0 ? (
            <EmptyState icon={Shield} title="Everything is in order" description="No contract ends soon and no visit is due in the next 30 days." />
          ) : null}
        </>
      )}
    </div>
  )
}
