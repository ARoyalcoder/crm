import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createTicket, slasQuery, ticketKeys, TICKET_PRIORITIES } from '@/features/support/api'

/** Create a new support ticket. */
export function CreateTicketPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [customerName, setCustomerName] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [slaId, setSlaId] = useState('')

  const { data: slas } = useQuery(slasQuery)

  const mutation = useMutation({
    mutationFn: () =>
      createTicket({
        customerName: customerName.trim(),
        subject: subject.trim(),
        description: description.trim() || null,
        priority,
        slaId: slaId || null,
      }),
    onSuccess: (detail) => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
      navigate(`/support/tickets/${detail.ticket.id}`)
    },
  })

  const canSubmit = customerName.trim() && subject.trim()

  return (
    <div className="grid gap-4">
      <PageHeader
        title="New support ticket"
        back={{ to: '/support/tickets', label: 'All tickets' }}
      />

      <form
        className="grid max-w-2xl gap-6 rounded-xl border border-border bg-card p-4 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) mutation.mutate()
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="customerName">Customer name *</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Acme Corporation"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the issue"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps to reproduce, expected vs actual behaviour, any relevant context…"
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sla">SLA</Label>
            <select
              id="sla"
              value={slaId}
              onChange={(e) => setSlaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">No SLA</option>
              {(slas ?? [])
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.resolutionTimeHours}h)
                  </option>
                ))}
            </select>
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">Could not create the ticket. Try again.</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/support/tickets')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create ticket'}
          </Button>
        </div>
      </form>
    </div>
  )
}
