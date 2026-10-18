import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type QuotationActionType = 'request_approval' | 'approve' | 'reject_approval' | 'send' | 'accept' | 'reject' | 'cancel'

type Copy = { title: (number: string) => string; description: string; submit: string; reason?: boolean; followUp?: boolean; destructive?: boolean }

const COPY: Record<QuotationActionType, Copy> = {
  request_approval: { title: (n) => `Submit ${n} for approval`, description: 'Managers are told it is ready for review.', submit: 'Submit for approval' },
  approve: { title: (n) => `Approve ${n}`, description: 'Once approved, sales can send it to the customer.', submit: 'Approve' },
  reject_approval: { title: (n) => `Send ${n} back`, description: 'It returns to draft for corrections.', submit: 'Send back to draft', reason: true, destructive: true },
  send: { title: (n) => `Send ${n} to the customer`, description: 'Record that it was sent, and when to follow up.', submit: 'Mark as sent', followUp: true },
  accept: { title: (n) => `${n} accepted`, description: 'The customer accepted. It can now become an order.', submit: 'Mark as accepted' },
  reject: { title: (n) => `${n} declined`, description: 'Record why the customer turned it down.', submit: 'Mark as declined', reason: true, destructive: true },
  cancel: { title: (n) => `Cancel ${n}`, description: 'The quotation will not be pursued. This is recorded and cannot be undone.', submit: 'Cancel quotation', reason: true, destructive: true },
}

const schema = z.object({ reason: z.string(), notes: z.string(), followUp: z.string() })
type FormValues = z.infer<typeof schema>

type QuotationActionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: QuotationActionType
  quotationNumber: string
  onConfirm: (data: { notes?: string; reason?: string; nextFollowUpDate?: string }) => void
  isPending?: boolean
  /** The failure of the last attempt, shown at the top of the form. */
  error?: unknown
}

/** One step in a quotation's life: asks for what that step needs (a reason, a follow-up date) and passes it on. */
export function QuotationActionModal({ open, onOpenChange, actionType, quotationNumber, onConfirm, isPending = false, error }: QuotationActionModalProps) {
  const copy = COPY[actionType]
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '', notes: '', followUp: '' } })

  const submit = form.handleSubmit((values) => {
    if (copy.reason && !values.reason.trim()) {
      form.setError('reason', { message: 'Give a reason' })
      return
    }
    onConfirm({ notes: values.notes.trim() || undefined, reason: values.reason.trim() || undefined, nextFollowUpDate: values.followUp || undefined })
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={copy.title(quotationNumber)}
        description={copy.description}
        submitLabel={copy.submit}
        destructive={copy.destructive}
        onSubmit={submit}
        submitting={isPending}
        error={error}
      >
        {copy.followUp ? (
          <FormField
            control={form.control}
            name="followUp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Follow up on</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        {copy.reason ? (
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="What happened, in a sentence or two" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Anything worth keeping with this step" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
