import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createQuotationVersion, type QuotationDetail } from '../api'
import { blankItem, itemFromSaved, itemToInput, itemsFormSchema, quotationTotals } from '../quotation-form'
import { QuotationItemsEditor } from './QuotationItemsEditor'
import { QuotationTotals } from './QuotationTotals'

const schema = z.object({
  changeSummary: z.string().trim().min(1, 'Say what changed in this version'),
  validUntil: z.string(),
  items: itemsFormSchema,
  discountPercentage: z.string().refine((value) => value === '' || (Number(value) >= 0 && Number(value) <= 100), 'Use 0 to 100'),
  terms: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

type CreateVersionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotation: QuotationDetail
  onSuccess: (updated: QuotationDetail) => void
}

/** Revises a quotation: the earlier versions are kept as they were, and the quotation goes back to draft. */
export function CreateVersionModal({ open, onOpenChange, quotation, onSuccess }: CreateVersionModalProps) {
  const current = quotation.currentVersion
  const next = quotation.currentVersionNumber + 1
  const fallbackTax = current?.taxPercentage ?? 0

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      changeSummary: '',
      validUntil: current?.validUntil ?? '',
      items: current?.items.length ? current.items.map(itemFromSaved) : [blankItem()],
      discountPercentage: current?.discountPercentage ? String(current.discountPercentage) : '',
      terms: current?.terms ?? '',
      notes: current?.notes ?? '',
    },
  })

  const items = useWatch({ control: form.control, name: 'items' })
  const discount = useWatch({ control: form.control, name: 'discountPercentage' })
  const totals = quotationTotals(items ?? [], Number(discount) || 0, fallbackTax)

  const publish = useMutation({
    mutationFn: (values: FormValues) =>
      createQuotationVersion(quotation.id, {
        changeSummary: values.changeSummary.trim(),
        validUntil: values.validUntil || null,
        terms: values.terms.trim() || null,
        notes: values.notes.trim() || null,
        nextFollowUpDate: quotation.nextFollowUpDate ?? null,
        discountPercentage: Number(values.discountPercentage) || 0,
        taxPercentage: fallbackTax,
        items: values.items.map(itemToInput),
      }),
    onSuccess: (updated) => {
      onSuccess(updated)
      onOpenChange(false)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`New version of ${quotation.quotationNumber} (v${next})`}
        description="Earlier versions stay unchanged. The quotation returns to draft for approval."
        submitLabel={`Publish version ${next}`}
        size="xl"
        onSubmit={form.handleSubmit((values) => publish.mutate(values))}
        submitting={publish.isPending}
        error={publish.error}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="changeSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What changed</FormLabel>
                  <FormControl>
                    <Input placeholder="Lower discount, better cable grade" {...field} />
                  </FormControl>
                  <FormDescription>Shown beside this version in the history.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid until</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <QuotationItemsEditor />

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms the customer sees</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
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
                  <FormLabel>Internal notes</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:w-64">
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra discount (%)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" min="0" max="100" step="any" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <QuotationTotals totals={totals} />
          </div>
        </div>
      </FormDialog>
    </Form>
  )
}
