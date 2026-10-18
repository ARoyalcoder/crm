
const SEGMENT_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  HEALTHY:    { label: 'Healthy',    className: 'bg-success-soft text-success' },
  AT_RISK:    { label: 'At risk',    className: 'bg-destructive-soft text-destructive' },
  INACTIVE:   { label: 'Inactive',   className: 'bg-muted text-muted-foreground' },
  HIGH_VALUE: { label: 'High value', className: 'bg-accent text-accent-foreground' },
  NEW:        { label: 'New',        className: 'bg-info-soft text-info' },
}

export function SegmentBadge({ segment }: { segment: string }) {
  const style = SEGMENT_STYLES[segment] ?? { label: segment, className: 'bg-muted text-muted-foreground' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  )
}
