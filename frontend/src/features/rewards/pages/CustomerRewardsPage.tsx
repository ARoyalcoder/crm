import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  customerRewardQuery,
  customerRewardHistoryQuery,
  addCustomerPoints,
  redeemCustomerPoints,
  refreshRewards,
  transactionTypeLabel,
} from '@/features/rewards/api'
import { PointsTile } from '@/features/rewards/components/PointsTile'
import { useHasPermission } from '@/features/auth/auth-context'

/** Customer rewards page: search by customer ID, show points tile + transaction history. */
export function CustomerRewardsPage() {
  const canManage = useHasPermission('REWARDS_MANAGE')
  const queryClient = useQueryClient()
  const [customerId, setCustomerId] = useState('')
  const [lookedUpId, setLookedUpId] = useState<string | null>(null)

  const [addMode, setAddMode] = useState(false)
  const [redeemMode, setRedeemMode] = useState(false)
  const [pointsInput, setPointsInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')
  const [acting, setActing] = useState(false)

  const rewardResult = useQuery({
    ...customerRewardQuery(lookedUpId ?? ''),
    enabled: !!lookedUpId,
  })

  const historyResult = useQuery({
    ...customerRewardHistoryQuery(lookedUpId ?? ''),
    enabled: !!lookedUpId,
  })

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (customerId.trim()) {
      setLookedUpId(customerId.trim())
    }
  }

  async function handleAddPoints() {
    if (!lookedUpId || !pointsInput || !reasonInput) return
    setActing(true)
    try {
      await addCustomerPoints(lookedUpId, { points: parseInt(pointsInput, 10), reason: reasonInput })
      await refreshRewards(queryClient)
      setAddMode(false)
      setPointsInput('')
      setReasonInput('')
    } finally {
      setActing(false)
    }
  }

  async function handleRedeem() {
    if (!lookedUpId || !pointsInput || !reasonInput) return
    setActing(true)
    try {
      await redeemCustomerPoints(lookedUpId, { points: parseInt(pointsInput, 10), reason: reasonInput })
      await refreshRewards(queryClient)
      setRedeemMode(false)
      setPointsInput('')
      setReasonInput('')
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Customer rewards"
        description="Loyalty points and transaction history per customer."
      />

      {/* Lookup form */}
      <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
          <input
            className="rounded-xl border bg-background px-3 py-1.5 text-sm w-80"
            placeholder="Paste customer UUID…"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm">Look up</Button>
      </form>

      {lookedUpId && (
        <>
          {/* Points tile */}
          {rewardResult.isPending ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : rewardResult.isError ? (
            <ErrorState
              title="Could not load reward data"
              error={rewardResult.error}
              onRetry={() => void rewardResult.refetch()}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <PointsTile
                totalPoints={rewardResult.data.totalPoints}
                tier={rewardResult.data.tier}
              />

              {canManage && (
                <div className="flex flex-col gap-2 justify-center">
                  <Button
                    size="sm"
                    onClick={() => { setAddMode(true); setRedeemMode(false) }}
                  >
                    Add points
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setRedeemMode(true); setAddMode(false) }}
                  >
                    Redeem
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Add / Redeem inline form */}
          {(addMode || redeemMode) && (
            <div className="rounded-xl border bg-card p-3.5 shadow-soft">
              <h3 className="mb-3 text-sm font-semibold">
                {addMode ? 'Add points' : 'Redeem points'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Points</label>
                  <input
                    type="number"
                    min={1}
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Reason</label>
                  <input
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  disabled={acting}
                  onClick={() => void (addMode ? handleAddPoints() : handleRedeem())}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setAddMode(false); setRedeemMode(false) }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Transaction history */}
          <div className="rounded-xl bg-card p-3 shadow-soft sm:p-3.5">
            <h2 className="mb-3 text-sm font-semibold">Transaction history</h2>
            {historyResult.isPending ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : historyResult.isError ? (
              <ErrorState
                title="Could not load history"
                error={historyResult.error}
                onRetry={() => void historyResult.refetch()}
              />
            ) : historyResult.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Reward transaction history</caption>
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">Date</th>
                      <th scope="col" className="pb-2 font-medium">Type</th>
                      <th scope="col" className="pb-2 font-medium">Reason</th>
                      <th scope="col" className="pb-2 text-right font-medium">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyResult.data.map((tx) => (
                      <tr key={tx.id} className="border-t align-middle">
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          {transactionTypeLabel(tx.transactionType)}
                        </td>
                        <td className="py-2 pr-3">{tx.reason}</td>
                        <td
                          className={`py-2 text-right tabular-nums font-semibold ${
                            tx.points > 0
                              ? 'text-success '
                              : 'text-destructive '
                          }`}
                        >
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
