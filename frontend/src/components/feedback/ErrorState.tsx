import { CircleAlert, RotateCw, ShieldAlert, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError, CLIENT_ERROR_CODES } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  /** What failed, in the user's terms: "Could not load business verticals". */
  title?: string
  message?: string
  error?: unknown
  onRetry?: () => void
  /** `compact` is for inside a card or chart; `inline` is the default alert box. */
  variant?: 'inline' | 'compact'
  className?: string
}

/** Standard way to show a failed query: what happened, how to retry, and the id to quote to support. */
export function ErrorState({ title, message: messageProp, error, onRetry, variant = 'inline', className }: ErrorStateProps) {
  const apiError = error instanceof ApiError ? error : undefined
  const forbidden = apiError?.status === 403
  const offline = apiError?.code === CLIENT_ERROR_CODES.network
  const heading = title ?? (forbidden ? 'You do not have access to this' : offline ? 'Cannot reach the server' : 'Something went wrong')
  const message =
    messageProp ??
    (apiError ? apiError.message : error instanceof Error ? error.message : 'Try again.')
  const requestId = apiError?.requestId
  const Icon = forbidden ? ShieldAlert : offline ? WifiOff : CircleAlert

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-2xl border border-destructive/25 bg-destructive-soft/70',
        variant === 'compact' ? 'flex-col items-center px-4 py-6 text-center' : 'flex-col items-start p-4',
        className,
      )}
    >
      <div className={cn('flex gap-3', variant === 'compact' ? 'flex-col items-center' : 'items-start')}>
        <Icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="grid gap-1">
          <p className="text-sm font-semibold">{heading}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          {requestId ? (
            <p className="text-xs text-muted-foreground">
              Reference: <code className="font-mono">{requestId}</code>
            </p>
          ) : null}
        </div>
      </div>
      {onRetry && !forbidden ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
