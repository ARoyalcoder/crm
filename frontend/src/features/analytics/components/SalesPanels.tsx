import { Handshake, Percent, Target, Trophy } from 'lucide-react'
import { BarsChart } from '@/components/charts/BarsChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { ordinalColors, seriesColor, verticalColor } from '@/components/charts/colors'
import { FunnelBars } from '@/components/charts/FunnelBars'
import { StatCard } from '@/components/shared/StatCard'
import type { Period, SalesOverview } from '@/features/analytics/api'
import type { ChartState } from '@/features/analytics/components/chart-state'
import { compactRupees, trendOf } from '@/features/analytics/lib'
import { formatNumber, formatPercent, formatRupees } from '@/lib/format'

type Panel = { sales?: SalesOverview; period?: Period; state: ChartState }

/** Leads and deals, each shown only when the server sent its half (it sends only what the person may see). */
export function SalesKpis({ sales, period, loading }: { sales?: SalesOverview; period?: Period; loading?: boolean }) {
  return (
    <>
      {sales === undefined || sales.pipeline ? (
        <>
          <StatCard
            label="Open pipeline"
            icon={Handshake}
            loading={loading}
            value={formatRupees(sales?.pipeline?.amount, { compact: true })}
            hint={sales?.pipeline ? `${formatNumber(sales.pipeline.deals)} open deals` : undefined}
            href="/opportunities"
          />
          <StatCard
            label="Won"
            icon={Trophy}
            tone="success"
            loading={loading}
            value={formatRupees(sales?.won?.value, { compact: true })}
            trend={trendOf(sales?.won, period)}
            hint={sales?.wonCount ? `${formatNumber(sales.wonCount.value)} deals closed won` : undefined}
            href="/opportunities"
          />
        </>
      ) : null}
      {sales === undefined || sales.leadsCreated ? (
        <>
          <StatCard
            label="New leads"
            icon={Target}
            tone="info"
            loading={loading}
            value={formatNumber(sales?.leadsCreated?.value)}
            trend={trendOf(sales?.leadsCreated, period)}
            href="/leads"
          />
          <StatCard
            label="Lead win rate"
            icon={Percent}
            tone="primary"
            loading={loading}
            value={formatPercent(sales?.leadWinRatePct)}
            hint={
              sales && sales.leadWinRatePct === null
                ? 'No leads closed in this period'
                : sales?.leadsLost != null
                  ? `${formatNumber(sales.leadsLost)} lost, of the leads closed in the period`
                  : undefined
            }
            href="/leads"
          />
        </>
      ) : null}
    </>
  )
}

export function LeadFunnelCard({ sales, state }: Omit<Panel, 'period'>) {
  const funnel = sales?.leadFunnel ?? []
  const created = funnel[0]?.count ?? 0
  return (
    <ChartCard
      title="Lead funnel"
      description="Leads created in the period, by stage reached"
      table={{
        caption: 'Leads created in the period, by stage reached',
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'count', label: 'Leads', align: 'right' },
        ],
        rows: funnel.map((stage) => ({ stage: stage.label, count: formatNumber(stage.count) })),
      }}
      empty={sales && created === 0 ? { title: 'No leads created in this period', description: 'New leads appear here and move down the funnel as they are worked.' } : false}
      drillDown={{ to: '/leads', label: 'View leads' }}
      height={160}
      {...state}
    >
      <FunnelBars label="Lead funnel" stages={funnel.map((stage) => ({ key: stage.key, label: stage.label, value: stage.count }))} />
    </ChartCard>
  )
}

export function PipelineByStageCard({ sales, state }: Omit<Panel, 'period'>) {
  const stages = sales?.pipelineByStage ?? []
  const colors = ordinalColors(stages.length)
  const total = sales?.pipeline?.amount ?? 0
  return (
    <ChartCard
      title="Open pipeline by stage"
      description={sales?.pipeline ? `${formatRupees(total)} across ${formatNumber(sales.pipeline.deals)} open deals` : undefined}
      table={{
        caption: 'Open deals and their value by pipeline stage',
        columns: [
          { key: 'stage', label: 'Stage' },
          { key: 'deals', label: 'Deals', align: 'right' },
          { key: 'amount', label: 'Value', align: 'right' },
        ],
        rows: stages.map((stage) => ({ stage: stage.stage, deals: formatNumber(stage.opportunities), amount: formatRupees(stage.amount) })),
      }}
      empty={sales && sales.pipeline && sales.pipeline.deals === 0 ? { title: 'No open deals', description: 'Create an opportunity from a qualified lead to start a pipeline.' } : false}
      drillDown={{ to: '/opportunities', label: 'Open the pipeline' }}
      {...state}
    >
      <BarsChart
        data={stages.map((stage) => ({ label: stage.stage, amount: stage.amount, deals: stage.opportunities }))}
        series={[{ key: 'amount', name: 'Open value', format: (v) => formatRupees(v) }]}
        colorBy={(_, index) => colors[index] ?? seriesColor(0)}
        valueFormat={compactRupees}
        tipLabels
        height={190}
        description="Open deal value per pipeline stage, earliest first."
      />
    </ChartCard>
  )
}

export function WonByVerticalCard({ rows, state }: { rows?: { code: string | null; name: string; amount: number }[] | null; state: ChartState }) {
  const nothing = rows !== undefined && rows !== null && rows.every((row) => row.amount === 0)
  return (
    <ChartCard
      title="Won by service line"
      description="Value of deals won in the period"
      table={{
        caption: 'Value of deals won, by service line',
        columns: [
          { key: 'name', label: 'Service line' },
          { key: 'amount', label: 'Won', align: 'right' },
        ],
        rows: (rows ?? []).map((row) => ({ name: row.name, amount: formatRupees(row.amount) })),
      }}
      empty={nothing ? { title: 'No deals won in this period' } : false}
      {...state}
    >
      <BarsChart
        orientation="bars"
        data={(rows ?? []).map((row) => ({ label: row.name, amount: row.amount, code: row.code }))}
        series={[{ key: 'amount', name: 'Won', format: (v) => formatRupees(v) }]}
        colorBy={(datum) => verticalColor(typeof datum.code === 'string' ? datum.code : null)}
        valueFormat={compactRupees}
        tipLabels
        description="Value of deals won in the period, per service line."
      />
    </ChartCard>
  )
}
