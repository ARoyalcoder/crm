import { PageHeader } from '@/components/layout/PageHeader'
import { TitanicPie } from '@/components/charts/TitanicPie'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Ship, Users, HeartHandshake, Skull } from 'lucide-react'

export function TitanicAnalyticsPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Titanic Survival Statistics"
        description="Historical survival distribution and demographic breakdown by passenger class and status."
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-card p-3 shadow-xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">2,224</div>
            <div className="text-xs font-medium text-muted-foreground">Total Onboard</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-card p-3 shadow-xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <HeartHandshake className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">710</div>
            <div className="text-xs font-medium text-muted-foreground">Survived (32%)</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-card p-3 shadow-xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
            <Skull className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">1,514</div>
            <div className="text-xs font-medium text-muted-foreground">Perished (68%)</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-card p-3 shadow-xs">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
            <Ship className="size-5" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-foreground">4 Classes</div>
            <div className="text-xs font-medium text-muted-foreground">1st, 2nd, 3rd & Crew</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Pie Chart */}
      <div className="grid gap-4">
        <TitanicPie />
      </div>

      {/* Data Insight Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Survival Rate by Ticket Class</CardTitle>
          <CardDescription>Official historical casualties and rescue ratios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">Survived</th>
                  <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">Lost</th>
                  <th className="py-2 px-3 text-right">Survival Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-rose-500">1st Class</td>
                  <td className="py-2.5 px-3 text-right font-medium">325</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">202</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">123</td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">62.2%</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-lime-600">2nd Class</td>
                  <td className="py-2.5 px-3 text-right font-medium">285</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">118</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">167</td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">41.4%</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-cyan-500">3rd Class</td>
                  <td className="py-2.5 px-3 text-right font-medium">706</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">178</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">528</td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">25.2%</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-purple-500">Crew</td>
                  <td className="py-2.5 px-3 text-right font-medium">908</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">212</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-600 dark:text-rose-400">696</td>
                  <td className="py-2.5 px-3 text-right font-bold text-foreground">23.3%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default TitanicAnalyticsPage
