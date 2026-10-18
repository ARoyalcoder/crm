import { useEffect, useMemo, useRef, type PointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, CalendarClock, ChevronRight, Clock, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatCompactSchedule,
  formatSchedule,
  formatShortLocation,
  JOB_STATUSES,
  JOB_TYPES,
  labelOf,
  type JobSummary,
} from '@/features/field-jobs/api'
import { apiBlob } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; dot: string; tone: string }> = {
  UNASSIGNED: { label: 'Unassigned', dot: 'bg-amber-500', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25' },
  ASSIGNED: { label: 'Assigned', dot: 'bg-slate-400', tone: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' },
  ACCEPTED: { label: 'Accepted', dot: 'bg-blue-500', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25' },
  EN_ROUTE: { label: 'En route', dot: 'bg-indigo-500', tone: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25' },
  ARRIVED: { label: 'Arrived', dot: 'bg-cyan-500', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-sky-500 animate-pulse', tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
  CUSTOMER_CONFIRMED: { label: 'Confirmed', dot: 'bg-emerald-600', tone: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-rose-500', tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25' },
}

/** The job's status in words with clean dot indicator. */
export function JobStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: labelOf(JOB_STATUSES, status),
    dot: 'bg-muted-foreground',
    tone: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', cfg.tone)}>
      <span className={cn('size-1.5 rounded-full shrink-0', cfg.dot)} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  )
}

export function DelayedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
      <Clock className="size-3 shrink-0" aria-hidden="true" />
      Overdue
    </span>
  )
}

/** One job as a clean, compact modern card. Designed to minimize text clutter and optimize readability. */
export function JobCard({ job }: { job: JobSummary }) {
  const isFinished = job.status === 'COMPLETED' || job.status === 'CUSTOMER_CONFIRMED' || job.status === 'CANCELLED'
  const shortLoc = formatShortLocation(job.siteAddress)

  return (
    <Link
      to={`/field-jobs/${job.id}`}
      className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-200 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 h-full"
    >
      <div>
        {/* Top Header: Job ID, Type & Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
              {job.jobNumber}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {labelOf(JOB_TYPES, job.jobType)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {job.delayed && !isFinished ? <DelayedBadge /> : null}
            <JobStatusBadge status={job.status} />
          </div>
        </div>

        {/* Title: clamped with tooltip */}
        <h3
          className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1"
          title={job.title}
        >
          {job.title}
        </h3>

        {/* Customer */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          <span className="font-medium text-foreground/80 truncate" title={job.customerName}>
            {job.customerName}
          </span>
        </div>

        {/* Compact Schedule & Location */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 shrink-0">
            <CalendarClock className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            <span>{formatCompactSchedule(job.scheduledStart, job.scheduledEnd)}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0" title={job.siteAddress}>
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            <span className="truncate">{shortLoc}</span>
          </div>
        </div>
      </div>

      {/* Integrated Technician Footer */}
      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-4.5 rounded-full bg-muted flex items-center justify-center font-bold text-[9px] text-muted-foreground shrink-0">
            {job.technicianName ? job.technicianName.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="truncate text-muted-foreground text-[11.5px]" title={job.technicianName || 'Unassigned'}>
            {job.technicianName || 'Unassigned'}
          </span>
        </div>
        <span className="text-[11px] font-medium text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
          Open <ChevronRight className="size-3" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

/**
 * A picture that lives behind the API. An ordinary <img src> cannot send the access token, so the
 * picture is fetched like any other request and shown from memory.
 */
export function AuthedImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const blob = useQuery({ queryKey: ['blob', path], queryFn: ({ signal }) => apiBlob(path, signal), staleTime: Infinity })
  const url = useMemo(() => (blob.data ? URL.createObjectURL(blob.data) : null), [blob.data])
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [url])

  if (url) {
    return <img src={url} alt={alt} className={className} />
  }
  if (blob.isError) {
    return <div className={cn('flex items-center justify-center bg-muted text-xs text-muted-foreground', className)}>Could not load</div>
  }
  return <Skeleton className={className} aria-busy="true" aria-label={`Loading ${alt}`} />
}

type SignaturePadProps = {
  /** Called with a PNG data URL after every stroke, and with null when the pad is cleared. */
  onChange: (signature: string | null) => void
}

/** A box the customer signs in with a finger, a stylus or a mouse. */
export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    // The canvas is drawn at a fixed size and stretched to the screen: translate between the two.
    return {
      x: ((event.clientX - box.left) / box.width) * event.currentTarget.width,
      y: ((event.clientY - box.top) / box.height) * event.currentTarget.height,
    }
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext('2d')
    if (!context) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    drawing.current = true
    const { x, y } = point(event)
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#1f1b3a'
    context.beginPath()
    context.moveTo(x, y)
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return
    }
    const context = event.currentTarget.getContext('2d')
    const { x, y } = point(event)
    context?.lineTo(x, y)
    context?.stroke()
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) {
      return
    }
    drawing.current = false
    onChange(event.currentTarget.toDataURL('image/png'))
  }

  function clear() {
    const element = canvas.current
    element?.getContext('2d')?.clearRect(0, 0, element.width, element.height)
    onChange(null)
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvas}
        width={600}
        height={200}
        role="img"
        aria-label="Signature"
        // touch-none: a finger on the pad draws instead of scrolling the page.
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-input bg-card"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={clear}>
        Clear signature
      </Button>
    </div>
  )
}
