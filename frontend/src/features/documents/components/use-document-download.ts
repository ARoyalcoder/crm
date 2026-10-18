import { useState } from 'react'
import { ApiError } from '@/lib/api/errors'
import { getDownloadUrl } from '../api'

/** Opens a document in a new tab through a short-lived link, and says so when that fails. */
export function useDocumentDownload() {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(id: string, title: string) {
    setError(null)
    setPendingId(id)
    try {
      const { url } = await getDownloadUrl(id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : `Could not get a download link for “${title}”. Try again.`)
    } finally {
      setPendingId(null)
    }
  }

  return { download, pendingId, error }
}
