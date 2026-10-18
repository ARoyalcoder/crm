import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  Globe,
  Hash,
  Laptop,
  Layers,
  Tag,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { auditLogQuery, formatDateTime, formatValue, type AuditDetail } from '@/features/audit/api'
import { ActionBadge } from '@/features/audit/components/ActionBadge'

type AuditDetailDrawerProps = {
  id: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Slide-over drawer displaying all detailed information, diffs, network details,
 * and metadata for a specific audit log event.
 */
export function AuditDetailDrawer({ id, open, onOpenChange }: AuditDetailDrawerProps) {
  const query = useQuery({
    ...auditLogQuery(id || ''),
    enabled: open && Boolean(id),
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {query.data && <ActionBadge action={query.data.entry.action} />}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {query.data?.entry.module || 'Audit Log'}
            </span>
          </div>
          <SheetTitle className="text-lg font-bold tracking-tight text-foreground">
            Audit Event Details
          </SheetTitle>
          <SheetDescription className="sr-only">
            Complete details, field changes, and request metadata for this audit event.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {query.isPending ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : query.isError ? (
            <div className="py-8">
              <ErrorState
                title="Could not load audit details"
                error={query.error}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.data ? (
            <AuditDetailContent detail={query.data} />
          ) : null}
        </div>

        {query.data && (
          <SheetFooter className="border-t border-border/60 bg-muted/20 px-6 py-3.5 sm:justify-between">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Link to={`/admin/audit/${query.data.entry.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Open Standalone Page
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Reusable content body showing EVERY piece of data for an audit record.
 */
export function AuditDetailContent({ detail }: { detail: AuditDetail }) {
  const { entry, before, after, metadata } = detail
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
  const metadataKeys = Object.keys(metadata ?? {})

  return (
    <div className="space-y-6">
      {/* Summary Callout Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-foreground">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FileCode className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">
              Summary
            </span>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground">
              {entry.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Core Details Grid */}
      <div>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Event Information
        </h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Timestamp */}
          <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3 shadow-2xs">
            <Clock className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Timestamp</span>
              <span className="block text-xs font-medium tabular-nums text-foreground">
                {formatDateTime(entry.occurredAt)}
              </span>
            </div>
          </div>

          {/* User / Actor */}
          <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3 shadow-2xs">
            <User className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">User / Actor</span>
              <span className="block text-xs font-medium text-foreground truncate">
                {entry.actorLabel || 'System'}
              </span>
              {entry.actorId && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  ID: {entry.actorId}
                </span>
              )}
            </div>
          </div>

          {/* Module & Action */}
          <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3 shadow-2xs">
            <Layers className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Module & Action</span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-xs font-medium capitalize text-foreground">
                  {entry.module}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <ActionBadge action={entry.action} />
              </div>
            </div>
          </div>

          {/* Target Entity */}
          <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3 shadow-2xs">
            <Tag className="mt-0.5 size-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">Target Entity</span>
              <span className="block text-xs font-medium text-foreground">
                {entry.entityType || '—'}
                {entry.entityLabel ? ` (${entry.entityLabel})` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entity ID & Network / Request Context */}
      <div>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Identifiers & Network Context
        </h4>
        <div className="space-y-2 rounded-xl border bg-card p-3.5 shadow-2xs text-xs">
          {/* Entity ID */}
          {entry.entityId && (
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="size-3.5" />
                <span>Entity ID</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-foreground font-medium">
                  {entry.entityId}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(entry.entityId!, 'Entity ID')}
                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Copy Entity ID"
                >
                  {copiedKey === 'Entity ID' ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* IP Address */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="size-3.5" />
              <span>IP Address</span>
            </div>
            <span className="font-mono text-[11px] text-foreground font-medium">
              {entry.ipAddress || '—'}
            </span>
          </div>

          {/* Request ID */}
          {detail.requestId && (
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="size-3.5" />
                <span>Request ID</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-foreground">
                  {detail.requestId}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(detail.requestId!, 'Request ID')}
                  className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Copy Request ID"
                >
                  {copiedKey === 'Request ID' ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* User Agent */}
          <div className="flex items-start justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2 text-muted-foreground shrink-0 mt-0.5">
              <Laptop className="size-3.5" />
              <span>User Agent</span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground text-right break-all max-w-[340px]">
              {detail.userAgent || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Values Changed (Before vs After Diff Table) */}
      {fields.length > 0 ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Field Changes
              </h4>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-1/3 text-xs font-semibold">Field</TableHead>
                  <TableHead className="w-1/3 text-xs font-semibold">Before</TableHead>
                  <TableHead className="w-1/3 text-xs font-semibold">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => {
                  const beforeVal = before?.[field]
                  const afterVal = after?.[field]
                  const isChanged = formatValue(beforeVal) !== formatValue(afterVal)

                  return (
                    <TableRow key={field} className={isChanged ? 'bg-primary/[0.02]' : undefined}>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {field}
                      </TableCell>
                      <TableCell className="text-xs break-all text-muted-foreground">
                        {beforeVal !== undefined && beforeVal !== null ? (
                          <span className="inline-block rounded px-1.5 py-0.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            {formatValue(beforeVal)}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs break-all font-medium text-foreground">
                        {afterVal !== undefined && afterVal !== null ? (
                          <span className="inline-block rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {formatValue(afterVal)}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {/* Additional Metadata */}
      {metadataKeys.length > 0 ? (
        <div>
          <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Additional Metadata
          </h4>
          <div className="space-y-1.5 rounded-xl border bg-card p-3 shadow-2xs text-xs">
            {metadataKeys.map((key) => (
              <div
                key={key}
                className="flex items-start justify-between gap-3 border-b border-border/30 pb-1.5 last:border-b-0 last:pb-0"
              >
                <span className="font-mono text-xs text-muted-foreground shrink-0">{key}:</span>
                <span className="font-mono text-xs text-foreground text-right break-all">
                  {formatValue(metadata?.[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Raw JSON Copy Button */}
      <div className="pt-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyText(JSON.stringify(detail, null, 2), 'Audit JSON')}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {copiedKey === 'Audit JSON' ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <Copy className="size-3.5" />
          )}
          Copy Raw Event JSON
        </Button>
      </div>
    </div>
  )
}
