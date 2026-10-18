import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatRupees } from '@/lib/format'
import { convertQuotationToOrder, orderKeys } from '../api'

const schema = z.object({
  title: z.string().trim().min(1, 'Give the order a title').max(250, 'Maximum 250 characters'),
  deliveryDate: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

type ConvertQuotationToOrderModalProps = {
  open: boolean
  onClose: () => void
  quotation: {
    id: string
    quotationNumber: string
    title: string
    customerName?: string | null
    finalAmount: number
    ownerId?: string | null
  }
}

/** Turns an accepted quotation into an order. Its lines, tax, discounts and terms are carried over as they were. */
export function ConvertQuotationToOrderModal({ open, onClose, quotation }: ConvertQuotationToOrderModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: `Order for ${quotation.quotationNumber}${quotation.customerName ? ` – ${quotation.customerName}` : ''}`,
      deliveryDate: '',
      notes: '',
    },
  })

  const convert = useMutation({
    mutationFn: (values: FormValues) =>
      convertQuotationToOrder({
        quotationId: quotation.id,
        title: values.title.trim(),
        deliveryDate: values.deliveryDate || undefined,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['quotations'] })
      onClose()
      navigate(`/orders/${order.id}`)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={(next) => (next ? undefined : onClose())}
        title="Convert to an order"
        description={`Quotation ${quotation.quotationNumber} was accepted. Confirm the order it becomes.`}
        submitLabel="Create the order"
        onSubmit={form.handleSubmit((values) => convert.mutate(values))}
        submitting={convert.isPending}
        error={convert.error}
      >
        <dl className="grid gap-1.5 rounded-xl border bg-muted/40 p-3 text-sm">
          {quotation.customerName ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{quotation.customerName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Order value</dt>
            <dd className="font-semibold tabular">{formatRupees(quotation.finalAmount, { exact: true })}</dd>
          </div>
          <p className="flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden="true" />
            Lines, tax, discounts and terms carry over.
          </p>
        </dl>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deliveryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery target</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Site access, handover contact, phasing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
