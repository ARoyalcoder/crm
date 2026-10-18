import { useId, type ChangeEvent } from 'react'
import { Label } from '@/components/ui/label'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../api'
import { formatFileSize } from './formatFileSize'

type FilePickerProps = {
  file: File | null
  onChange: (file: File | null) => void
  error: string | null
  onError: (message: string | null) => void
  label?: string
}

/** A file chooser that checks the size and type before anything is uploaded, and says what was picked. */
export function FilePicker({ file, onChange, error, onError, label = 'File' }: FilePickerProps) {
  const id = useId()

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    onError(null)
    onChange(null)
    if (!selected) return
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      onError(`That file is ${formatFileSize(selected.size)}. The most that can be uploaded is 50 MB.`)
      return
    }
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      onError(`Files of type “${selected.type || 'unknown'}” cannot be uploaded.`)
      return
    }
    onChange(selected)
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </Label>
      <input
        id={id}
        type="file"
        onChange={pick}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        className="block w-full rounded-lg border border-input bg-card text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent/70 aria-invalid:border-destructive"
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {file ? (
          <>
            <span className="font-medium text-foreground">{file.name}</span> · {formatFileSize(file.size)}
          </>
        ) : (
          'PDF, Word, Excel, PowerPoint, images, ZIP, text or CSV, up to 50 MB.'
        )}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
