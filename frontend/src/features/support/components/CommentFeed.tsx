import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { addComment, ticketKeys, type CommentRow } from '@/features/support/api'

type Props = {
  ticketId: string
  comments: CommentRow[]
  canAddInternal?: boolean
}

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Displays the thread of comments and provides an input to add new ones. */
export function CommentFeed({ ticketId, comments, canAddInternal = false }: Props) {
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => addComment(ticketId, body.trim(), internal),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) })
    },
  })

  return (
    <div className="grid gap-4">
      {/* Thread */}
      <ul className="grid gap-3" aria-label="Comments">
        {comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border p-4 text-sm ${
              c.internal
                ? 'border-warning/30 bg-warning-soft'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-1">
              <span className="font-medium">{c.authorName}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {c.internal && (
                  <span className="flex items-center gap-1 text-warning ">
                    <Lock className="size-3" aria-hidden="true" />
                    Internal note
                  </span>
                )}
                <time dateTime={c.createdAt}>{dateFormat.format(new Date(c.createdAt))}</time>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-foreground/90">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="rounded-xl bg-card p-3 text-center text-sm text-muted-foreground">
            No comments yet.
          </li>
        )}
      </ul>

      {/* Compose */}
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3">
        <Textarea
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          aria-label="New comment"
        />
        <div className="flex items-center justify-between gap-2">
          {canAddInternal && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
              />
              <Lock className="size-3 text-warning " aria-hidden="true" />
              Internal note
            </label>
          )}
          {!canAddInternal && <span />}
          <Button
            size="sm"
            disabled={!body.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Send className="size-4" aria-hidden="true" />
            {mutation.isPending ? 'Sending…' : 'Send'}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-xs text-destructive">Could not post the comment. Try again.</p>
        )}
      </div>
    </div>
  )
}
