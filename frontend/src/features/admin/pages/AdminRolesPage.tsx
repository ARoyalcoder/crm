import { Shield } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { humanize } from '@/lib/format'

/** Permissions are named AREA_ACTION (LEAD_VIEW, INVOICE_CREATE). Grouping by area makes a long list readable. */
function groupByArea(permissions: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const permission of [...permissions].sort()) {
    const area = permission.split('_')[0] ?? permission
    groups.set(area, [...(groups.get(area) ?? []), permission])
  }
  return [...groups.entries()]
}

export function AdminRolesPage() {
  const { user } = useAuth()
  const groups = groupByArea(user?.permissions ?? [])

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Roles & permissions"
        back={{ to: '/admin', label: 'Administration' }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-primary" aria-hidden="true" />
            Your access
          </CardTitle>
          <CardDescription>
            You are signed in as <span className="font-medium text-foreground">{user?.fullName}</span> with{' '}
            {user?.roles.length ? user.roles.map(humanize).join(', ') : 'no role'}. That gives you {user?.permissions.length ?? 0} permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your account has no permissions yet.</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map(([area, permissions]) => (
                <div key={area} className="grid gap-1.5">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{humanize(area)}</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {permissions.map((permission) => (
                      <Badge key={permission} variant="neutral" className="font-normal">
                        {humanize(permission.slice(area.length + 1) || permission)}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
