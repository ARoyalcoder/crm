import type { ContributorScore } from '../api'
import { SCORE_CONTRIBUTORS } from '../api'

function contributorLabel(name: string) {
  return SCORE_CONTRIBUTORS.find((c) => c.value === name)?.label ?? name.replace(/_/g, ' ')
}

function scoreColor(score: number, maxScore: number) {
  const pct = maxScore > 0 ? score / maxScore : 0
  if (pct >= 0.8) return 'text-success '
  if (pct >= 0.5) return 'text-warning '
  return 'text-destructive '
}

export function ScoreBreakdownTable({ breakdown }: { breakdown: ContributorScore[] }) {
  if (breakdown.length === 0) {
    return <p className="text-sm text-muted-foreground">No breakdown available.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Contributor</th>
            <th className="text-center py-2 px-4 font-medium text-muted-foreground w-28">Score</th>
            <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Reason</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row) => (
            <tr key={row.contributor} className="border-b last:border-0">
              <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                {contributorLabel(row.contributor)}
              </td>
              <td className="py-2.5 px-4 text-center">
                <span className={`font-semibold ${scoreColor(row.score, row.maxScore)}`}>
                  {row.score}
                </span>
                <span className="text-muted-foreground"> / {row.maxScore}</span>
                {/* Mini progress bar */}
                <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      row.score / row.maxScore >= 0.8
                        ? 'bg-success'
                        : row.score / row.maxScore >= 0.5
                          ? 'bg-warning'
                          : 'bg-destructive-solid'
                    }`}
                    style={{ width: `${row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0}%` }}
                  />
                </div>
              </td>
              <td className="py-2.5 pl-4 text-muted-foreground">{row.reason}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td className="py-2.5 pr-4">Total</td>
            <td className="py-2.5 px-4 text-center">
              {breakdown.reduce((s, r) => s + r.score, 0)}{' '}
              <span className="font-normal text-muted-foreground">/ 100</span>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
