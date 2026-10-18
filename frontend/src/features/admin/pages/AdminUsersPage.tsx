import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, RefreshCw, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { dataTableColumns, DataTable } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { FilterSelect, ListToolbar, SearchInput } from '@/components/list/ListControls'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, controlClass } from '@/components/ui/input'
import { useAuth, useHasPermission } from '@/features/auth/auth-context'
import { apiRequest } from '@/lib/api/client'
import { humanize } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { cn } from '@/lib/utils'

const AVAILABLE_ROLES = [
  { code: 'SUPER_ADMIN', label: 'Super admin' },
  { code: 'ADMIN', label: 'Admin' },
  { code: 'DIRECTOR', label: 'Director' },
  { code: 'SALES_MANAGER', label: 'Sales manager' },
  { code: 'SALES_EXECUTIVE', label: 'Sales executive' },
  { code: 'PROJECT_MANAGER', label: 'Project manager' },
  { code: 'DESIGNER', label: 'Designer' },
  { code: 'TECHNICIAN', label: 'Technician' },
  { code: 'FINANCE', label: 'Finance' },
  { code: 'HR', label: 'HR' },
  { code: 'SUPPORT_AGENT', label: 'Support agent' },
  { code: 'VENDOR', label: 'Vendor partner' },
  { code: 'PARTNER', label: 'Channel partner' },
]

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  roles: z.array(z.object({ code: z.string().optional(), name: z.string() })),
  active: z.boolean(),
})
export type User = z.infer<typeof userSchema>

const accountSchema = z.object({ id: z.string(), email: z.string(), fullName: z.string(), status: z.string() })

const column = dataTableColumns<User>()

/** Everyone with an account: their roles, whether they can sign in, and (for those who may) a way to switch that. */
export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const params = useListParams()
  const { user: me } = useAuth()
  const canUpdate = useHasPermission('USER_UPDATE')
  const canCreate = useHasPermission('USER_CREATE') || me?.roles?.includes('SUPER_ADMIN') || me?.roles?.includes('ADMIN')
  const [deactivating, setDeactivating] = useState<User | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newFullName, setNewFullName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('Password@123')
  const [newRole, setNewRole] = useState('SALES_EXECUTIVE')
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState('SALES_EXECUTIVE')
  const [editError, setEditError] = useState<string | null>(null)

  const search = params.get('search').toLowerCase()
  const status = params.get('status')

  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: () => apiRequest('/api/v1/users', z.array(userSchema)) })

  const createUser = useMutation({
    mutationFn: (body: { fullName: string; email: string; password: string; roleCode: string }) =>
      apiRequest('/api/v1/users', z.any(), { method: 'POST', body }),
    onSuccess: () => {
      toast.success('User created')
      setIsAdding(false)
      setNewFullName('')
      setNewEmail('')
      setNewPassword('Password@123')
      setNewRole('SALES_EXECUTIVE')
      setCreateError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: any) => {
      setCreateError(err?.message || 'Could not create the user. Check the email and details.')
    },
  })

  const updateUser = useMutation({
    mutationFn: (body: { id: string; fullName: string; roleCode: string }) =>
      apiRequest(`/api/v1/users/${body.id}`, z.any(), {
        method: 'PUT',
        body: { fullName: body.fullName, roleCode: body.roleCode },
      }),
    onSuccess: () => {
      toast.success('User updated')
      setEditingUser(null)
      setEditError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: any) => {
      setEditError(err?.message || 'Could not update the user. Try again.')
    },
  })

  const setActive = useMutation({
    mutationFn: ({ user, active }: { user: User; active: boolean }) => apiRequest(`/api/v1/users/${user.id}/${active ? 'activate' : 'deactivate'}`, accountSchema, { method: 'POST' }),
    onSettled: () => {
      setDeactivating(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const rows = useMemo(
    () =>
      (users.data ?? []).filter(
        (user) =>
          (!search || `${user.name} ${user.email}`.toLowerCase().includes(search)) &&
          (!status || (status === 'ACTIVE' ? user.active : !user.active)),
      ),
    [users.data, search, status],
  )
  const filtered = Boolean(search || status)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('name', {
          header: 'Name',
          cell: ({ row }) => (
            <span className="grid gap-0.5">
              <span className="font-medium">
                {row.original.name}
                {row.original.id === me?.id ? <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            </span>
          ),
        }),
        column.display({
          id: 'roles',
          header: 'Roles',
          cell: ({ row }) =>
            row.original.roles.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {row.original.roles.map((role) => (
                  <Badge key={role.name} variant="neutral">
                    {humanize(role.name)}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No role</span>
            ),
        }),
        column.accessor('active', { header: 'Status', cell: ({ getValue }) => <StatusBadge active={getValue()} /> }),
        column.display({
          id: 'actions',
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => {
            const user = row.original
            if (!canUpdate || user.id === me?.id) return null
            return (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Edit role for ${user.name}`}
                  onClick={() => {
                    const match = AVAILABLE_ROLES.find(
                      (r) =>
                        (user.roles[0]?.code && r.code.toUpperCase() === user.roles[0]?.code.toUpperCase()) ||
                        (user.roles[0]?.name && r.label.toLowerCase() === user.roles[0]?.name.toLowerCase()) ||
                        (user.roles[0]?.name && r.code.toLowerCase() === user.roles[0]?.name.toLowerCase()),
                    )
                    setEditingUser(user)
                    setEditFullName(user.name)
                    setEditRole(match?.code || user.roles[0]?.code || 'SALES_EXECUTIVE')
                    setEditError(null)
                  }}
                >
                  <Pencil className="mr-1 size-3.5" aria-hidden="true" />
                  Edit role
                </Button>
                {user.active ? (
                  <Button variant="outline" size="sm" aria-label={`Deactivate ${user.name}`} onClick={() => setDeactivating(user)}>
                    <UserX aria-hidden="true" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Activate ${user.name}`}
                    loading={setActive.isPending && setActive.variables?.user.id === user.id}
                    onClick={() => setActive.mutate({ user, active: true })}
                  >
                    <UserCheck aria-hidden="true" />
                    Activate
                  </Button>
                )}
              </div>
            )
          },
        }),
      ]),
    [canUpdate, me?.id, setActive],
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Users"
        back={{ to: '/admin', label: 'Administration' }}
        description="Everyone with an account. Deactivated people cannot sign in; their work stays on record."
        action={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => setIsAdding(true)}>
                <UserPlus className="mr-2 size-4" />
                Add user
              </Button>
            )}
            <Button variant="outline" onClick={() => void users.refetch()} loading={users.isFetching}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4">
          <ListToolbar onReset={filtered ? () => params.setMany({ search: '', status: '' }) : undefined}>
            <SearchInput label="Search people" value={params.get('search')} onChange={(value) => params.set('search', value)} />
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={(value) => params.set('status', value)}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </ListToolbar>
          {setActive.isError ? <ErrorState title="That change could not be saved" error={setActive.error} variant="compact" /> : null}
          {users.isPending ? (
            <SkeletonLoader variant="table" label="Loading users" />
          ) : users.isError ? (
            <ErrorState title="Could not load the users" error={users.error} onRetry={() => void users.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows}
                caption="Users"
                empty={<EmptyState variant="compact" icon={Users} title={filtered ? 'No one matches' : 'No users yet'} description={filtered ? 'Try another search or clear filters.' : undefined} />}
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                <span className="font-medium text-foreground tabular">{rows.length}</span> {rows.length === 1 ? 'person' : 'people'}
                {filtered ? ` of ${users.data.length}` : ''}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deactivating !== null}
        onOpenChange={(open) => (open ? undefined : setDeactivating(null))}
        title={deactivating ? `Deactivate ${deactivating.name}?` : 'Deactivate this person?'}
        description="They can no longer sign in. Their records stay, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        destructive
        pending={setActive.isPending}
        onConfirm={() => deactivating && setActive.mutate({ user: deactivating, active: false })}
      />

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create an account with login credentials and a role.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setCreateError(null)
              if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
                setCreateError('Fill in all required fields.')
                return
              }
              createUser.mutate({
                fullName: newFullName.trim(),
                email: newEmail.trim(),
                password: newPassword.trim(),
                roleCode: newRole,
              })
            }}
            className="grid gap-4 py-2"
          >
            {createError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {createError}
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Full name *
              </label>
              <Input
                placeholder="e.g. Anand Verma"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email / username *
              </label>
              <Input
                type="email"
                placeholder="e.g. anand@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password *
              </label>
              <Input
                type="text"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role *
              </label>
              <select
                className={cn('h-10 py-1 md:h-9', controlClass)}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createUser.isPending}>
                Create user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update account details or change the role for {editingUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!editingUser) return
              setEditError(null)
              if (!editFullName.trim() || !editRole.trim()) {
                setEditError('Fill in all required fields.')
                return
              }
              updateUser.mutate({
                id: editingUser.id,
                fullName: editFullName.trim(),
                roleCode: editRole.trim(),
              })
            }}
            className="grid gap-4 py-2"
          >
            {editError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Full name *
              </label>
              <Input
                placeholder="Full name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email / username
              </label>
              <Input
                type="email"
                value={editingUser?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed opacity-80"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role *
              </label>
              <select
                className={cn('h-10 py-1 md:h-9', controlClass)}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateUser.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
