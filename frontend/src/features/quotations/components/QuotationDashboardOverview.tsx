import { Bell, CheckCircle2, Clock, FileSpreadsheet, FileX2, PencilLine, ReceiptIndianRupee, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/shared/StatCard'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { kpiGrid } from '@/features/analytics/lib'
import { formatNumber, formatRupees } from '@/lib/format'
import type { QuotationDashboard } from '../api'

/** How many quotations are at each stage, what has been quoted, and who is due a call today. */
export function QuotationDashboardOverview({ dashboard }: { dashboard: QuotationDashboard }) {
  return (
    <div className="grid gap-4">
      <div className={kpiGrid(8)}>
        <StatCard label="Quotations" icon={FileSpreadsheet} value={formatNumber(dashboard.totalQuotations)} hint="Not counting deleted ones" href="/quotations" />
        <StatCard
          label="Total quoted"
          icon={ReceiptIndianRupee}
          value={formatRupees(dashboard.totalValue, { compact: true })}
          hint="Every quotation, whatever its status"
        />
        <StatCard label="Drafts" icon={PencilLine} value={formatNumber(dashboard.draftCount)} hint="Still being prepared" href="/quotations?status=DRAFT" />
        <StatCard
          label="Awaiting approval"
          icon={Clock}
          tone={dashboard.pendingApprovalCount > 0 ? 'warning' : 'neutral'}
          value={formatNumber(dashboard.pendingApprovalCount)}
          hint="A manager needs to review"
          href="/quotations?status=PENDING_APPROVAL"
        />
        <StatCard label="Sent" icon={Send} tone="info" value={formatNumber(dashboard.sentCount)} hint="Waiting for the customer" href="/quotations?status=SENT" />
        <StatCard label="Accepted" icon={CheckCircle2} tone="success" value={formatNumber(dashboard.acceptedCount)} hint="Won" href="/quotations?status=ACCEPTED" />
        <StatCard
          label="Declined or expired"
          icon={FileX2}
          value={formatNumber(dashboard.rejectedCount + dashboard.expiredCount)}
          hint={`${formatNumber(dashboard.rejectedCount)} declined, ${formatNumber(dashboard.expiredCount)} expired`}
          href="/quotations?status=REJECTED"
        />
        <StatCard
          label="Follow-ups today"
          icon={Bell}
          tone={dashboard.todaysFollowUpsCount > 0 ? 'warning' : 'neutral'}
          value={formatNumber(dashboard.todaysFollowUpsCount)}
          hint="Customers to call back"
          href="/quotations?followUp=today"
        />
      </div>

      {dashboard.todaysFollowUps.length > 0 ? (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Follow up today</CardTitle>
            <CardAction>
              <Link to="/quotations?followUp=today" className="text-sm font-medium text-primary hover:underline">
                See all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {dashboard.todaysFollowUps.map((quotation) => (
                <li key={quotation.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3 text-sm">
                  <span className="grid gap-0.5">
                    <Link to={`/quotations/${quotation.id}`} className="font-medium underline-offset-2 hover:underline">
                      <span className="font-mono">{quotation.quotationNumber}</span> · {quotation.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{quotation.customerName || quotation.leadName || 'No customer yet'}</span>
                  </span>
                  <span className="font-medium tabular">{formatRupees(quotation.finalAmount, { exact: true })}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
