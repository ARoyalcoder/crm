import { BellRing, ChevronDown, LogOut, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-context'
import { humanize, initials } from '@/lib/format'

/** The signed-in person: avatar, name and role, and the account menu (profile, notification preferences, sign out). */
export function UserMenu() {
  const { user, signOut } = useAuth()
  if (!user) return null
  const canSeeProfile = user.permissions.includes('WORKFORCE_VIEW')
  const canSeeNotifications = user.permissions.includes('NOTIFICATION_VIEW')
  const role = user.roles[0] ? humanize(user.roles[0]) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-0.5 pr-0.5 pl-0.5 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 lg:pr-2.5"
      >
        <span className="flex size-7.5 sm:size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] sm:text-xs font-semibold text-primary-foreground">
          {initials(user.fullName)}
        </span>
        <span className="hidden min-w-0 text-left leading-tight lg:block">
          <span className="block max-w-36 truncate text-xs font-semibold">{user.fullName}</span>
          {role ? <span className="block max-w-36 truncate text-[10.5px] text-muted-foreground">{role}</span> : null}
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground lg:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="truncate text-sm font-semibold text-foreground">{user.fullName}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canSeeProfile ? (
          <DropdownMenuItem asChild>
            <Link to="/workforce/my-profile">
              <UserCheck className="size-4 text-blue-500 dark:text-blue-400" aria-hidden="true" /> My profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canSeeNotifications ? (
          <DropdownMenuItem asChild>
            <Link to="/notifications/preferences">
              <BellRing className="size-4 text-amber-500 dark:text-amber-400" aria-hidden="true" /> Notification preferences
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4 text-rose-500 dark:text-rose-400" aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
