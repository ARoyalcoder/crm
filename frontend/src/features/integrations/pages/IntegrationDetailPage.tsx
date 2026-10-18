import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useHasPermission } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api/errors'
import { INTEGRATION_LABELS, integrationKeys, integrationsApi, type Integration } from '@/features/integrations/api'
import { IntegrationStatusBadge } from '@/features/integrations/components/IntegrationStatusBadge'
import { formatDateTime } from '@/lib/format'

const schema = z.object({
  providerName: z.string().trim().max(100, 'Maximum 100 characters'),
  configJson: z.string().refine((value) => {
    if (value.trim() === '') return true
    try {
      const parsed: unknown = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    } catch {
      return false
    }
  }, 'Not valid JSON. Use an object, such as { "apiKey": "…" }'),
})
type FormValues = z.infer<typeof schema>

/** One connected service: whether it works, test and switch it on or off, and enter its credentials. */
export function IntegrationDetailPage() {
  const { type = '' } = useParams<{ type: string }>()
  const canManage = useHasPermission('INTEGRATION_MANAGE')
  const queryClient = useQueryClient()
  const label = INTEGRATION_LABELS[type] ?? type

  const query = useQuery({ ...integrationsApi.detailQuery(type), retry: false })
  // A service nobody has set up yet has no record, and asking for it is a 404. That is not a failure: it is where setting up starts.
  const notSetUp = query.error instanceof ApiError && query.error.status === 404
  const integration: Integration | undefined = notSetUp
    ? { id: '', type, providerName: null, status: 'NOT_CONFIGURED', enabled: false, lastTestedAt: null, lastError: null }
    : query.data
  const refresh = () => void queryClient.invalidateQueries({ queryKey: integrationKeys.all })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), values: { providerName: integration?.providerName ?? '', configJson: '' } })

  const save = useMutation({
    ...integrationsApi.upsertMutation(),
    onSuccess: () => {
      refresh()
      form.reset({ providerName: form.getValues('providerName'), configJson: '' })
      toast.success(`${label} saved`)
    },
  })
  const test = useMutation({ ...integrationsApi.testMutation(), onSuccess: refresh })
  const enable = useMutation({ ...integrationsApi.enableMutation(), onSuccess: refresh })
  const disable = useMutation({ ...integrationsApi.disableMutation(), onSuccess: refresh })
  const actionError = test.error ?? enable.error ?? disable.error

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title={label}
        back={{ to: '/admin/integrations', label: 'Integrations' }}
        meta={integration ? <IntegrationStatusBadge status={integration.status} /> : null}
        description="Test the connection and keep credentials current."
        action={
          canManage && integration && !notSetUp ? (
            <>
              <Button variant="outline" onClick={() => test.mutate(type)} loading={test.isPending}>
                Test connection
              </Button>
              {integration.enabled ? (
                <Button variant="outline" onClick={() => disable.mutate(type)} loading={disable.isPending}>
                  Disable
                </Button>
              ) : (
                <Button onClick={() => enable.mutate(type)} loading={enable.isPending} disabled={integration.status === 'NOT_CONFIGURED'}>
                  Enable
                </Button>
              )}
            </>
          ) : null
        }
      />

      {query.isPending ? (
        <SkeletonLoader variant="card" height={180} label="Loading the integration" />
      ) : !integration ? (
        <ErrorState title="Could not load this integration" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {actionError ? <ErrorState title="That did not work" error={actionError} variant="compact" /> : null}

          <Card>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-4">
                <div className="grid gap-1">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    <IntegrationStatusBadge status={integration.status} />
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs text-muted-foreground">In use</dt>
                  <dd className="font-medium">{integration.enabled ? 'Yes' : 'No'}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs text-muted-foreground">Provider</dt>
                  <dd className="font-medium">{integration.providerName ?? '—'}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-xs text-muted-foreground">Last tested</dt>
                  <dd className="font-medium">{integration.lastTestedAt ? formatDateTime(integration.lastTestedAt) : 'Never'}</dd>
                </div>
              </dl>
              {integration.lastError ? (
                <p role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
                  <span className="font-semibold">Last error:</span> {integration.lastError}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Connection details</CardTitle>
                <CardDescription>
                  Credentials are stored encrypted and never shown again. Leave empty to keep what is saved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((values) => save.mutate({ type, data: { providerName: values.providerName, configJson: values.configJson } }))} className="grid gap-4" noValidate>
                    <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                      Paste only credentials you may use here, and do not share your screen while this form is open.
                    </p>
                    {save.isError ? <ErrorState title="That could not be saved" error={save.error} variant="compact" /> : null}
                    <FormField
                      control={form.control}
                      name="providerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <FormControl>
                            <Input placeholder="SendGrid, Twilio, Razorpay…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="configJson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Configuration (JSON)</FormLabel>
                          <FormControl>
                            <Textarea rows={8} autoComplete="off" autoCorrect="off" spellCheck={false} className="font-mono" placeholder={'{\n  "apiKey": "…",\n  "apiSecret": "…"\n}'} {...field} />
                          </FormControl>
                          <FormDescription>Anything entered replaces the saved credentials.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" loading={save.isPending}>
                        Save
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Changing this needs the Integration manage permission, which your role lacks.</p>
          )}
        </>
      )}
    </div>
  )
}
