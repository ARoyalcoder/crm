import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellOff } from 'lucide-react'
import { Bell } from '@/components/animate-ui/icons/bell'
import { CheckCheck } from '@/components/animate-ui/icons/check-check'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { entityPath } from '@/lib/entity-links'
import { cn } from '@/lib/utils'
import { notificationsApi, type Notification } from '../api'
import { NotificationItem } from './NotificationItem'

/**
 * The bell in the header and the panel it opens: the newest notifications, a one-click "mark all read",
 * and a way into the full page. Opening a notification marks it read and goes to the record it is about.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const unreadCountResult = useQuery(notificationsApi.unreadCountQuery())
  const unreadResult = useQuery({
    ...notificationsApi.unreadQuery(),
    enabled: open, // the list is only needed while the panel is open
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh })
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh })

  const unreadCount = unreadCountResult.data?.count ?? 0

  function openNotification(notification: Notification) {
    if (!notification.read) markRead.mutate(notification.id)
    setOpen(false)
    const target = entityPath(notification.entityType, notification.entityId)
    if (target) void navigate(target)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell
            animateOnHover
            loop={unreadCount > 0}
            loopDelay={4}
            className={cn('size-4 transition-colors', unreadCount > 0 ? 'text-amber-500 fill-amber-500/20' : 'text-blue-500 dark:text-blue-400')}
            aria-hidden="true"
          />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive-solid px-1',
                'text-[10px] leading-none font-semibold text-white ring-2 ring-background',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[22rem] max-w-[22rem]" align="end" aria-label="Notifications">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck animateOnHover className="size-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-[26rem] overflow-y-auto p-1.5">
          {unreadResult.isPending ? (
            <div className="p-3">
              <SkeletonLoader variant="list" count={3} label="Loading notifications" />
            </div>
          ) : unreadResult.isError ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-muted-foreground">
              Could not load notifications.{' '}
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => void unreadResult.refetch()}>
                Try again
              </button>
            </p>
          ) : unreadResult.data.length === 0 ? (
            <EmptyState variant="compact" icon={BellOff} title="You are all caught up" description="New notifications will appear here." />
          ) : (
            <ul className="grid gap-0.5">
              {unreadResult.data.map((n) => (
                <li key={n.id}>
                  <NotificationItem notification={n} onClick={openNotification} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
          <PopoverClose asChild>
            <Link to="/notifications" className="font-medium text-primary hover:underline">
              View all
            </Link>
          </PopoverClose>
          <PopoverClose asChild>
            <Link to="/notifications/preferences" className="text-muted-foreground hover:text-foreground hover:underline">
              Preferences
            </Link>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}
