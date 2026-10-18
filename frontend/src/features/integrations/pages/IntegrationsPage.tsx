import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cable, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { toneChip } from '@/components/shared/tones'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/features/auth/auth-context'
import { ALL_INTEGRATION_TYPES, INTEGRATION_LABELS, integrationKeys, integrationsApi, type Integration } from '@/features/integrations/api'
import { IntegrationStatusBadge } from '@/features/integrations/components/IntegrationStatusBadge'
import { formatRelative } from '@/lib/format'

function IntegrationCard({ type, integration, canManage }: { type: string; integration?: Integration; canManage: boolean }) {
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: integrationKeys.all })
  const enable = useMutation({ ...integrationsApi.enableMutation(), onSuccess: refresh })
  const disable = useMutation({ ...integrationsApi.disableMutation(), onSuccess: refresh })
  const test = useMutation({ ...integrationsApi.testMutation(), onSuccess: refresh })

  const label = INTEGRATION_LABELS[type] ?? type
  const status = integration?.status ?? 'NOT_CONFIGURED'
  const busy = enable.isPending || disable.isPending || test.isPending
  const failure = enable.error ?? disable.error ?? test.error

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneChip.primary}`}>
            <Cable className="size-5" aria-hidden="true" />
          </span>
          <div className="grid min-w-0">
            <h2 className="truncate text-sm font-semibold">{label}</h2>
            <p className="truncate text-xs text-muted-foreground">{integration?.providerName ?? 'No provider chosen'}</p>
          </div>
        </div>
        <IntegrationStatusBadge status={status} />
      </div>

      {integration?.lastError ? (
        <p className="line-clamp-2 text-xs text-destructive" title={integration.lastError}>
          {integration.lastError}
        </p>
      ) : integration?.lastTestedAt ? (
        <p className="text-xs text-muted-foreground">Last tested {formatRelative(integration.lastTestedAt)}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{integration ? 'Not tested yet' : 'Set it up to use it'}</p>
      )}

      {failure ? <ErrorState title="That did not work" error={failure} variant="compact" /> : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canManage && integration ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || status === 'NOT_CONFIGURED'}
              loading={enable.isPending || disable.isPending}
              onClick={() => (integration.enabled ? disable.mutate(type) : enable.mutate(type))}
            >
              {integration.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} loading={test.isPending} onClick={() => test.mutate(type)}>
              Test
            </Button>
          </>
        ) : null}
        <Button size="sm" asChild className="ml-auto">
          <Link to={`/admin/integrations/${type}`} aria-label={`${canManage ? 'Set up' : 'View'} ${label}`}>
            <Settings2 aria-hidden="true" />
            {canManage ? (integration ? 'Configure' : 'Set up') : 'Details'}
          </Link>
        </Button>
      </div>
    </li>
  )
}

/** The outside services the business connects (email, messaging, payments, storage) and whether each one is working. */
export function IntegrationsPage() {
  const canManage = useHasPermission('INTEGRATION_MANAGE')
  const integrations = useQuery(integrationsApi.listQuery())
  const byType = Object.fromEntries((integrations.data ?? []).map((integration) => [integration.type, integration]))

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Integrations"
        back={{ to: '/admin', label: 'Administration' }}
        description="Connect email, messaging, payments, storage and more. Test one to confirm it works."
      />
      {integrations.isPending ? (
        <SkeletonLoader variant="card" height={260} label="Loading integrations" />
      ) : integrations.isError ? (
        <ErrorState title="Could not load the integrations" error={integrations.error} onRetry={() => void integrations.refetch()} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Integrations">
          {ALL_INTEGRATION_TYPES.map((type) => (
            <IntegrationCard key={type} type={type} integration={byType[type]} canManage={canManage} />
          ))}
        </ul>
      )}
    </div>
  )
}
