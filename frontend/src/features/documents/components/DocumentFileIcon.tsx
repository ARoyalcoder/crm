import { File, FileArchive, FileImage, FileSpreadsheet, FileText, Presentation, type LucideIcon } from 'lucide-react'
import { toneChip } from '@/components/shared/tones'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

function look(mimeType: string): { icon: LucideIcon; tone: Tone; label: string } {
  if (mimeType === 'application/pdf') return { icon: FileText, tone: 'danger', label: 'PDF' }
  if (mimeType.startsWith('image/')) return { icon: FileImage, tone: 'info', label: 'Image' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return { icon: FileSpreadsheet, tone: 'success', label: 'Spreadsheet' }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return { icon: Presentation, tone: 'warning', label: 'Presentation' }
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType === 'text/plain') return { icon: FileText, tone: 'primary', label: 'Document' }
  if (mimeType === 'application/zip') return { icon: FileArchive, tone: 'neutral', label: 'Archive' }
  return { icon: File, tone: 'neutral', label: 'File' }
}

/** The kind of file, as a tinted icon with the kind in words for screen readers. */
export function DocumentFileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const { icon: Icon, tone, label } = look(mimeType)
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', toneChip[tone], className)} title={mimeType}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
