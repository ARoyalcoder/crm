import { formatFileSize } from './formatFileSize'

interface Props {
  bytes: number
  className?: string
}

/** Inline badge that shows a file size in KB or MB. */
export function FileSizeBadge({ bytes, className = '' }: Props) {
  return (
    <span className={`text-xs text-muted-foreground  ${className}`}>
      {formatFileSize(bytes)}
    </span>
  )
}
