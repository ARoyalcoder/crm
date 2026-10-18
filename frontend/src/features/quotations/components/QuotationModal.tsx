import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { pickedOption } from '@/components/shared/picker-schema'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import { LeadPicker } from '@/features/leads/components/LeadPicker'
import { OpportunityPicker } from '@/features/opportunities/components/OpportunityPicker'
import { createQuotation, updateDraftQuotation, type CreateQuotationPayload, type QuotationDetail } from '../api'
import { blankItem, itemFromSaved, itemToInput, itemsFormSchema, quotationTotals } from '../quotation-form'
import { QuotationItemsEditor } from './QuotationItemsEditor'
import { QuotationTotals } from './QuotationTotals'

const schema = z.object({
  title: z.string().trim().min(1, 'Give the quotation a subject').max(250, 'Maximum 250 characters'),
  validUntil: z.string(),
  customer: pickedOption.nullable(),
  lead: pickedOption.nullable(),
  opportunity: pickedOption.nullable(),
  items: itemsFormSchema,
  discountPercentage: z.string().refine((value) => value === '' || (Number(value) >= 0 && Number(value) <= 100), 'Use 0 to 100'),
  terms: z.string(),
  notes: z.string(),
  nextFollowUpDate: z.string(),
})
type FormValues = z.infer<typeof schema>

const STANDARD_TERMS = 'Payment: 50% in advance, the balance on completion.'

type QuotationModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The draft being edited; leave out to write a new quotation. */
  quotation?: QuotationDetail | null
  onSuccess: (quotation: QuotationDetail) => void
}

/** Writes a new quotation or edits a draft: who it is for, what is sold, the terms and when to follow up. */
export function QuotationModal({ open, onOpenChange, quotation, onSuccess }: QuotationModalProps) {
  const editing = Boolean(quotation)
  const version = quotation?.currentVersion
  // A quotation-wide GST rate saved with an older quotation is kept; new ones take GST from their lines.
  const fallbackTax = version?.taxPercentage ?? 0

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: quotation?.title ?? '',
      validUntil: quotation?.validUntil ?? '',
      customer: quotation?.customerId ? { id: quotation.customerId, name: quotation.customerName ?? 'Customer' } : null,
      lead: quotation?.leadId ? { id: quotation.leadId, name: quotation.leadName ?? 'Lead' } : null,
      opportunity: quotation?.opportunityId ? { id: quotation.opportunityId, name: quotation.opportunityTitle ?? 'Deal' } : null,
      items: version?.items.length ? version.items.map(itemFromSaved) : [blankItem()],
      discountPercentage: version?.discountPercentage ? String(version.discountPercentage) : '',
      terms: version?.terms ?? (editing ? '' : STANDARD_TERMS),
      notes: version?.notes ?? '',
      nextFollowUpDate: quotation?.nextFollowUpDate ?? '',
    },
  })

  const items = useWatch({ control: form.control, name: 'items' })
  const discount = useWatch({ control: form.control, name: 'discountPercentage' })
  const totals = quotationTotals(items ?? [], Number(discount) || 0, fallbackTax)

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: CreateQuotationPayload = {
        title: values.title.trim(),
        customerId: values.customer?.id ?? null,
        customerName: values.customer?.name ?? null,
        leadId: values.lead?.id ?? null,
        leadName: values.lead?.name ?? null,
        opportunityId: values.opportunity?.id ?? null,
        opportunityTitle: values.opportunity?.name ?? null,
        validUntil: values.validUntil || null,
        nextFollowUpDate: values.nextFollowUpDate || null,
        terms: values.terms.trim() || null,
        notes: values.notes.trim() || null,
        discountPercentage: Number(values.discountPercentage) || 0,
        taxPercentage: fallbackTax,
        items: values.items.map(itemToInput),
      }
      return editing && quotation ? updateDraftQuotation(quotation.id, payload) : createQuotation(payload)
    },
    onSuccess: (saved) => {
      onSuccess(saved)
      onOpenChange(false)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={editing ? `Edit ${quotation?.quotationNumber}` : 'New quotation'}
        description={editing ? 'Edit the draft: lines, terms and customer.' : 'A price proposal with its lines, GST and terms.'}
        submitLabel={editing ? 'Save changes' : 'Create quotation'}
        size="xl"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        submitting={save.isPending}
        error={save.error}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="CCTV and access control for the Pune warehouse" {...field} />
                  </FormControl>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <EntityPickerField control={form.control} name="customer" label="Customer">
            {(field) => <CustomerPicker {...field} />}
          </EntityPickerField>
          <EntityPickerField control={form.control} name="lead" label="Lead">
            {(field) => <LeadPicker {...field} />}
          </EntityPickerField>
          <EntityPickerField control={form.control} name="opportunity" label="Deal">
            {(field) => <OpportunityPicker {...field} />}
          </EntityPickerField>
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
                    <Textarea rows={4} placeholder="Payment, delivery, warranty" {...field} />
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
                    <Textarea rows={4} placeholder="How the price was worked out. Hidden from the customer." {...field} />
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
                  <FormDescription>Off the whole quotation, on top of line discounts.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <QuotationTotals totals={totals} />
          </div>
        </div>

        <FormField
          control={form.control}
          name="nextFollowUpDate"
          render={({ field }) => (
            <FormItem className="sm:max-w-xs">
              <FormLabel>Follow up on</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
