import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { notificationsApi, type NotificationPreference } from '../api'

// All known business event types that can have preferences configured.
const KNOWN_EVENT_TYPES = [
  { key: 'LEAD_CREATED', label: 'Lead created' },
  { key: 'LEAD_QUALIFIED', label: 'Lead qualified' },
  { key: 'LEAD_CONVERTED', label: 'Lead converted' },
  { key: 'QUOTE_CREATED', label: 'Quote created' },
  { key: 'QUOTE_ACCEPTED', label: 'Quote accepted' },
  { key: 'QUOTE_REJECTED', label: 'Quote rejected' },
  { key: 'ORDER_CREATED', label: 'Order created' },
  { key: 'ORDER_CONFIRMED', label: 'Order confirmed' },
  { key: 'ORDER_CANCELLED', label: 'Order cancelled' },
  { key: 'PROJECT_STARTED', label: 'Project started' },
  { key: 'PROJECT_COMPLETED', label: 'Project completed' },
  { key: 'PROJECT_DELAYED', label: 'Project delayed' },
  { key: 'TASK_COMPLETED', label: 'Task completed' },
  { key: 'MILESTONE_REACHED', label: 'Milestone reached' },
  { key: 'PAYMENT_RECEIVED', label: 'Payment received' },
  { key: 'PAYMENT_OVERDUE', label: 'Payment overdue' },
  { key: 'INVOICE_ISSUED', label: 'Invoice issued' },
  { key: 'INVOICE_CANCELLED', label: 'Invoice cancelled' },
  { key: 'TICKET_CREATED', label: 'Ticket created' },
  { key: 'TICKET_RESOLVED', label: 'Ticket resolved' },
  { key: 'TICKET_SLA_BREACHED', label: 'SLA breached' },
  { key: 'AMC_EXPIRING', label: 'AMC expiring soon' },
  { key: 'AMC_RENEWED', label: 'AMC renewed' },
  { key: 'AMC_EXPIRED', label: 'AMC expired' },
  { key: 'WARRANTY_CLAIMED', label: 'Warranty claimed' },
  { key: 'ATTENDANCE_MARKED', label: 'Attendance marked' },
  { key: 'USER_CREATED', label: 'User created' },
  { key: 'USER_DEACTIVATED', label: 'User deactivated' },
]

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient()
  const { data: savedPrefs, isPending, isError, refetch } = useQuery(notificationsApi.preferencesQuery())

  const updateMutation = useMutation({
    mutationFn: ({ eventType, inAppEnabled, emailEnabled }: { eventType: string; inAppEnabled: boolean; emailEnabled: boolean }) =>
      notificationsApi.updatePreference(eventType, { inAppEnabled, emailEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] }),
  })

  function getPref(eventType: string): NotificationPreference | undefined {
    return savedPrefs?.find((p) => p.eventType === eventType)
  }

  // Defaults when no explicit preference row has been saved yet.
  function isInApp(eventType: string): boolean {
    return getPref(eventType)?.inAppEnabled ?? true
  }
  function isEmail(eventType: string): boolean {
    return getPref(eventType)?.emailEnabled ?? false
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Notification preferences"
        description="Choose which events notify you in-app or by email."
        back={{ to: '/notifications', label: 'Back to notifications' }}
      />

      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Could not load preferences." onRetry={() => refetch()} />
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Event</th>
                <th className="px-4 py-2 text-center font-medium">In-app</th>
                <th className="px-4 py-2 text-center font-medium">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {KNOWN_EVENT_TYPES.map(({ key, label }) => (
                <tr key={key} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={isInApp(key)}
                      onChange={(v) =>
                        updateMutation.mutate({ eventType: key, inAppEnabled: v, emailEnabled: isEmail(key) })
                      }
                      disabled={updateMutation.isPending}
                      label={`In-app notifications for ${label}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={isEmail(key)}
                      onChange={(v) =>
                        updateMutation.mutate({ eventType: key, inAppEnabled: isInApp(key), emailEnabled: v })
                      }
                      disabled={updateMutation.isPending}
                      label={`Email notifications for ${label}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
