import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { notificationsApi, type Notification } from '../api'
import { NotificationItem } from '../components/NotificationItem'

type ReadFilter = 'all' | 'unread' | 'read'

export function NotificationCenterPage() {
  const [page, setPage] = useState(0)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const queryClient = useQueryClient()

  const { data, isPending, isError, refetch } = useQuery(notificationsApi.allQuery(page, 20))

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications: Notification[] = data?.content ?? []

  const filtered = notifications.filter((n) => {
    if (readFilter === 'unread') return !n.read
    if (readFilter === 'read') return n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Notifications"
        description="Events across your organisation."
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={readFilter}
          onValueChange={(v) => {
            setReadFilter(v as ReadFilter)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Could not load notifications." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No notifications found.</div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={(notification) => {
                if (!notification.read) {
                  markReadMutation.mutate(notification.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
            disabled={page >= data.totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
