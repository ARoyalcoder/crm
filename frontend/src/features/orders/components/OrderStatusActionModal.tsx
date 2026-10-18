import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { orderKeys, updateOrderStatus, type OrderStatus } from '../api'

const COPY: Record<OrderStatus, { title: string; description: (number: string) => string; submit: string }> = {
  CONFIRMED: { title: 'Confirm the order', description: (number) => `Move order ${number} back to confirmed.`, submit: 'Confirm order' },
  IN_PROGRESS: { title: 'Start work on this order', description: (number) => `Fulfilment of order ${number} begins: procurement, scheduling and delivery.`, submit: 'Start work' },
  PARTIALLY_DELIVERED: { title: 'Record a partial delivery', description: (number) => `Some of order ${number} has been handed over; the rest is still to come.`, submit: 'Mark partly delivered' },
  COMPLETED: { title: 'Complete the order', description: (number) => `Everything on order ${number} has been delivered.`, submit: 'Mark completed' },
  CANCELLED: { title: 'Cancel the order', description: (number) => `Order ${number} will not go ahead. This is recorded and cannot be undone.`, submit: 'Cancel order' },
}

const schema = z.object({
  reason: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

type OrderStatusActionModalProps = {
  open: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  targetStatus: OrderStatus
}

/** Moves an order to its next stage. Cancelling asks for the reason, which is kept with the order. */
export function OrderStatusActionModal({ open, onClose, orderId, orderNumber, targetStatus }: OrderStatusActionModalProps) {
  const queryClient = useQueryClient()
  const cancelling = targetStatus === 'CANCELLED'
  const copy = COPY[targetStatus]
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '', notes: '' } })

  const move = useMutation({
    mutationFn: (values: FormValues) =>
      updateOrderStatus(orderId, {
        status: targetStatus,
        reason: cancelling ? values.reason.trim() : undefined,
        notes: values.notes.trim() || (cancelling ? values.reason.trim() : undefined),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      onClose()
    },
  })

  const submit = form.handleSubmit((values) => {
    if (cancelling && values.reason.trim().length < 3) {
      form.setError('reason', { message: 'Say why the order is being cancelled' })
      return
    }
    move.mutate(values)
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={(next) => (next ? undefined : onClose())}
        title={copy.title}
        description={copy.description(orderNumber)}
        submitLabel={copy.submit}
        destructive={cancelling}
        onSubmit={submit}
        submitting={move.isPending}
        error={move.error}
      >
        {cancelling ? (
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for cancelling</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="The customer withdrew, the quotation was replaced…" {...field} />
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
              <FormLabel>Note {cancelling ? '' : '(optional)'}</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Optional note with this change" {...field} />
              </FormControl>
              <FormDescription>It appears in the order's history.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
