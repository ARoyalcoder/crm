import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/features/customers/components/CustomerPicker'
import {
  WARRANTY_STATUSES,
  createWarranty,
  updateWarranty,
  warrantyDetailQuery,
  warrantyKeys,
  type WarrantyDetail,
  type WarrantySummary,
} from '../api'

const picked = z.object({ id: z.string(), name: z.string(), hint: z.string().optional() })

const schema = z
  .object({
    customer: picked.nullable(),
    description: z.string().trim().min(1, 'Say what the warranty covers').max(500, 'Keep it under 500 characters'),
    startDate: z.string().min(1, 'Choose the start date'),
    endDate: z.string().min(1, 'Choose the end date'),
    status: z.enum(['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOIDED']),
    terms: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.customer) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customer'], message: 'Choose a customer' })
    }
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date cannot be before start date' })
    }
  })
type FormValues = z.infer<typeof schema>

function WarrantyForm({ existing, onClose }: { existing?: WarrantyDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          customer: { id: existing.customerId, name: existing.customerName ?? 'Customer' },
          description: existing.description,
          startDate: existing.startDate,
          endDate: existing.endDate,
          status: existing.status,
          terms: existing.terms ?? '',
        }
      : { customer: null, description: '', startDate: '', endDate: '', status: 'ACTIVE', terms: '' },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        customerId: values.customer!.id,
        // A warranty can be tied to an order, a project or a service. This form does not edit those links; an edit keeps them.
        orderId: existing?.orderId ?? undefined,
        projectId: existing?.projectId ?? undefined,
        serviceOfferingId: existing?.serviceOfferingId ?? undefined,
        description: values.description.trim(),
        terms: values.terms.trim() || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
      }
      return existing ? updateWarranty(existing.id, { ...payload, status: values.status }) : createWarranty(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: warrantyKeys.all })
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title={existing ? 'Edit warranty' : 'New warranty'}
        description="What is covered, and for how long."
        submitLabel={existing ? 'Save changes' : 'Create warranty'}
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        submitting={save.isPending}
        error={save.error}
      >
        <EntityPickerField control={form.control} name="customer" label="Customer" required>
          {(field) => <CustomerPicker {...field} />}
        </EntityPickerField>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Covers</FormLabel>
              <FormControl>
                <Input placeholder="Two years on cameras and recorder" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {existing ? (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {WARRANTY_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="What is covered and what is not" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

type WarrantyDialogProps = {
  /** The warranty to edit, or `null` to create a new one. */
  warranty: WarrantySummary | null
  onClose: () => void
}

/** Creates or edits a warranty. An edit first fetches the full record, because the list does not carry the terms. */
export function WarrantyDialog({ warranty, onClose }: WarrantyDialogProps) {
  const detail = useQuery({ ...warrantyDetailQuery(warranty?.id ?? ''), enabled: Boolean(warranty) })

  if (warranty && !detail.data) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit warranty</DialogTitle>
            <DialogDescription className="sr-only">Loading the warranty</DialogDescription>
          </DialogHeader>
          {detail.isError ? (
            <ErrorState title="Could not load this warranty" error={detail.error} onRetry={() => void detail.refetch()} />
          ) : (
            <SkeletonLoader variant="card" height={220} label="Loading the warranty" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return <WarrantyForm existing={detail.data} onClose={onClose} />
}
