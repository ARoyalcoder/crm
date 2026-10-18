import { useQuery } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { leaderboardQuery } from '@/features/rewards/api'

/** Leaderboard: top employees ordered by total achievement points. */
export function AchievementsPage() {
  const result = useQuery(leaderboardQuery())

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Achievements leaderboard"
        description="Employees ranked by total achievement points earned."
      />

      {result.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading leaderboard" />
      ) : result.isError ? (
        <ErrorState
          title="Could not load leaderboard"
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <div className="rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
          {result.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No achievements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Achievement leaderboard</caption>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2 font-medium w-8">#</th>
                    <th scope="col" className="pb-2 font-medium">User</th>
                    <th scope="col" className="pb-2 font-medium text-right">Total points</th>
                    <th scope="col" className="pb-2 font-medium text-right">Achievements</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((entry, idx) => (
                    <tr key={entry.userId} className="border-t align-middle">
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? 'bg-warning/20 text-warning '
                              : idx === 1
                              ? 'bg-border/30 text-muted-foreground '
                              : idx === 2
                              ? 'bg-warning/15 text-warning '
                              : 'text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.userId}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                        {entry.totalPoints.toLocaleString()}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {entry.achievementCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
