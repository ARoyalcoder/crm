import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'

type PermissionGateProps = {
  /** Shown if the user holds this permission. */
  permission?: string
  /** Shown if the user holds at least one of these. */
  anyOf?: string[]
  /** Rendered instead when access is missing. Defaults to nothing. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Hides UI the user cannot use. A convenience, not security: the API checks the same permission
 * on every request.
 */
export function PermissionGate({ permission, anyOf, fallback = null, children }: PermissionGateProps) {
  const { user } = useAuth()
  const held = user?.permissions ?? []
  const allowed = permission ? held.includes(permission) : anyOf ? anyOf.some((p) => held.includes(p)) : true
  return <>{allowed ? children : fallback}</>
}
