import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  receivablesConfigQuery,
  updateReceivablesConfig,
  refreshReceivables,
  type ReceivablesConfig,
} from '@/features/receivables/api'
import { useHasPermission } from '@/features/auth/auth-context'

function ConfigForm({ config }: { config: ReceivablesConfig }) {
  const queryClient = useQueryClient()
  const canManage = useHasPermission('RECEIVABLES_MANAGE')

  const [overdueDays1, setOverdueDays1] = useState(config.overdueDays1)
  const [overdueDays2, setOverdueDays2] = useState(config.overdueDays2)
  const [collectionTaskEnabled, setCollectionTaskEnabled] = useState(config.collectionTaskEnabled)
  const [escalationEnabled, setEscalationEnabled] = useState(config.escalationEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [syncedConfig, setSyncedConfig] = useState(config)
  if (syncedConfig !== config) {
    setSyncedConfig(config)
    setOverdueDays1(config.overdueDays1)
    setOverdueDays2(config.overdueDays2)
    setCollectionTaskEnabled(config.collectionTaskEnabled)
    setEscalationEnabled(config.escalationEnabled)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (overdueDays1 <= 0 || overdueDays2 <= overdueDays1) {
      setError('Threshold 2 must exceed threshold 1, and both must be positive.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateReceivablesConfig({
        overdueDays1,
        overdueDays2,
        collectionTaskEnabled,
        escalationEnabled,
        escalationUserId: config.escalationUserId ?? null,
      })
      await refreshReceivables(queryClient)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save configuration.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-5 rounded-xl bg-card p-3.5 shadow-soft">
      <h2 className="text-sm font-semibold">Automation thresholds</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="overdueDays1" className="text-sm font-medium">
            Create task after (days overdue)
          </label>
          <Input
            id="overdueDays1"
            type="number"
            min={1}
            value={overdueDays1}
            onChange={(e) => setOverdueDays1(Number(e.target.value))}
            disabled={!canManage}
          />
          <p className="text-xs text-muted-foreground">
            A collection task is created automatically when an invoice is this many days overdue.
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="overdueDays2" className="text-sm font-medium">
            Escalate after (days overdue)
          </label>
          <Input
            id="overdueDays2"
            type="number"
            min={overdueDays1 + 1}
            value={overdueDays2}
            onChange={(e) => setOverdueDays2(Number(e.target.value))}
            disabled={!canManage}
          />
          <p className="text-xs text-muted-foreground">
            An escalation notice is logged when an invoice is this many days overdue.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={collectionTaskEnabled}
            onChange={(e) => setCollectionTaskEnabled(e.target.checked)}
            disabled={!canManage}
          />
          <span className="text-sm">Automatically create collection tasks for overdue invoices</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={escalationEnabled}
            onChange={(e) => setEscalationEnabled(e.target.checked)}
            disabled={!canManage}
          />
          <span className="text-sm">Log escalation notices for very overdue invoices</span>
        </label>
      </div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p role="status" className="text-sm text-success">Configuration saved.</p> : null}

      {canManage ? (
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save configuration'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You need RECEIVABLES_MANAGE permission to change this.</p>
      )}
    </form>
  )
}

/** Receivables configuration (`/receivables/config`): automation thresholds and escalation. */
export function ReceivablesConfigPage() {
  const config = useQuery(receivablesConfigQuery)

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Receivables configuration"
        description="Thresholds for automatic collection tasks and escalations."
      />
      {config.isPending ? (
        <Skeleton className="h-60 w-full rounded-2xl" aria-busy="true" aria-label="Loading configuration" />
      ) : config.isError ? (
        <ErrorState
          title="Could not load configuration"
          error={config.error}
          onRetry={() => void config.refetch()}
        />
      ) : (
        <ConfigForm config={config.data} />
      )}
    </div>
  )
}
