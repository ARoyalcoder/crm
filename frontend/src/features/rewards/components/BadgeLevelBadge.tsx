/** Coloured pill showing a badge level (BRONZE / SILVER / GOLD / PLATINUM). */
export function BadgeLevelBadge({ level }: { level: string | null | undefined }) {
  if (!level) return null

  const config: Record<string, { label: string; className: string }> = {
    BRONZE: {
      label: 'Bronze',
      className: 'bg-warning/10 text-warning',
    },
    SILVER: {
      label: 'Silver',
      className: 'bg-muted-foreground/10 text-muted-foreground',
    },
    GOLD: {
      label: 'Gold',
      className: 'bg-warning/10 text-warning',
    },
    PLATINUM: {
      label: 'Platinum',
      className: 'bg-info/10 text-info',
    },
  }

  const { label, className } = config[level] ?? {
    label: level,
    className: 'bg-muted text-muted-foreground',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
