import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDialog } from '@/components/shared/FormDialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { documentKeys, uploadNewVersion } from '../api'
import { FilePicker } from './FilePicker'

type NewVersionModalProps = {
  documentId: string
  documentTitle: string
  currentVersion: number
  onClose: () => void
}

/** Replaces a document's file with a newer one. The earlier file stays in the version history. */
export function NewVersionModal({ documentId, documentTitle, currentVersion, onClose }: NewVersionModalProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const upload = useMutation({
    mutationFn: () => uploadNewVersion({ documentId, file: file!, notes: notes.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.all })
      onClose()
    },
  })

  return (
    <FormDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={`Version ${currentVersion + 1} of “${documentTitle}”`}
      description="The chosen file becomes current. Earlier files stay in the version history."
      submitLabel="Upload version"
      onSubmit={(event) => {
        event.preventDefault()
        if (!file) {
          setFileError('Choose the new file')
          return
        }
        upload.mutate()
      }}
      submitting={upload.isPending}
      error={upload.error}
    >
      <FilePicker file={file} error={fileError} onError={setFileError} onChange={setFile} label="New file" />
      <div className="grid gap-2">
        <Label htmlFor="version-notes">Why it is being replaced</Label>
        <Textarea id="version-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Corrected the totals on page 2" />
      </div>
    </FormDialog>
  )
}
