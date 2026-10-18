import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MessageSquareText, Send, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/errors'
import { ask, askSuggestionsQuery, type AskResponse } from '@/features/ask/api'
import { formatNumber } from '@/lib/format'

type Turn = { id: number; question: string; state: 'pending' | 'answered' | 'failed'; response?: AskResponse; error?: string }

function Answer({ turn }: { turn: Turn }) {
  if (turn.state === 'pending') {
    return (
      <div className="grid gap-2" role="status" aria-label="Working out the answer">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }
  if (turn.state === 'failed') {
    return (
      <p role="alert" className="text-sm text-destructive">
        {turn.error ?? 'That failed. Try again.'}
      </p>
    )
  }
  const response = turn.response!
  const shown = response.supportingRecords.length
  return (
    <div className="grid gap-3">
      <p className="text-base font-semibold">{response.answer}</p>
      {response.reasoning ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How this was worked out: </span>
          {response.reasoning}
        </p>
      ) : null}
      {shown > 0 ? (
        <div className="overflow-hidden rounded-xl border">
          <ul className="divide-y">
            {response.supportingRecords.map((record, index) => {
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{record.title}</span>
                    {record.detail ? <span className="block truncate text-xs text-muted-foreground">{record.detail}</span> : null}
                  </span>
                  {record.url ? <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                </>
              )
              return (
                <li key={record.id ?? index}>
                  {record.url ? (
                    <Link to={record.url} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
          {response.totalRecords > shown ? (
            <p className="border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              Showing {formatNumber(shown)} of {formatNumber(response.totalRecords)}
            </p>
          ) : null}
        </div>
      ) : null}
      {response.recommendedActionUrl ? (
        <div>
          <Button asChild variant="outline" size="sm">
            <Link to={response.recommendedActionUrl}>
              {response.recommendedAction ?? 'Open'}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Ask a question about your own records in plain words; each answer says how it was worked out and shows the records behind it. */
export function AskPawanPage() {
  const suggestions = useQuery(askSuggestionsQuery)
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((turn) => turn.state === 'pending')

  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  async function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || busy) return
    const id = nextId.current++
    setText('')
    setTurns((prev) => [...prev, { id, question: trimmed, state: 'pending' }])
    try {
      const response = await ask(trimmed)
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, state: 'answered', response } : turn)))
    } catch (error) {
      const message = error instanceof ApiError ? error.message : undefined
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, state: 'failed', error: message } : turn)))
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void send(text)
  }

  const questions = suggestions.data ?? []

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Ask Pawan"
        description="Ask about your records in plain words. Answers use only data you may see and show how they were worked out."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Conversation" className="grid gap-4">
          {turns.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="What would you like to know?"
              description="Pick a question, or type your own below."
            />
          ) : (
            <ol className="grid gap-5">
              {turns.map((turn) => (
                <li key={turn.id} className="grid gap-2">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{turn.question}</p>
                  </div>
                  <Card className="max-w-full gap-0 p-3 sm:p-3.5">
                    <Answer turn={turn} />
                  </Card>
                </li>
              ))}
            </ol>
          )}
          <div ref={endRef} />

          <form onSubmit={submit} className="sticky bottom-4 flex gap-2 rounded-xl border bg-card p-2 shadow-pop">
            <label htmlFor="ask-question" className="sr-only">
              Your question
            </label>
            <Input
              id="ask-question"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ask, e.g. which invoices are overdue?"
              disabled={busy}
              autoComplete="off"
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <Button type="submit" loading={busy} disabled={!text.trim()}>
              <Send aria-hidden="true" />
              <span className="hidden sm:inline">Ask</span>
              <span className="sr-only sm:hidden">Ask</span>
            </Button>
          </form>
        </section>

        <Card className="gap-0 p-0 lg:sticky lg:top-24">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Questions you can ask
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {suggestions.isPending ? (
              <div className="grid gap-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : questions.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No questions available for your role yet.</p>
            ) : (
              <ul className="grid gap-0.5">
                {questions.map((suggestion) => (
                  <li key={suggestion.tool}>
                    <button
                      type="button"
                      onClick={() => void send(suggestion.question)}
                      disabled={busy}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50"
                    >
                      {suggestion.question}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
