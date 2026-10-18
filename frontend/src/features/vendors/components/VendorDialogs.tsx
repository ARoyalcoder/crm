import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { blankToNull } from '@/lib/forms'
import { VENDOR_RATING_CATEGORIES, addVendorScore, createVendorContact, updateVendorContact, vendorKeys, type VendorContact } from '../api'

const PHONE = /^[+0-9][0-9 ()-]{5,28}$/

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name').max(200, 'Maximum 200 characters'),
  designation: z.string().max(150, 'Keep this under 150 characters'),
  email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  phone: z.string().trim().min(1, 'Enter a phone number').regex(PHONE, 'Enter a valid phone, e.g. +91 98765 43210'),
  primaryContact: z.boolean(),
})
type ContactValues = z.infer<typeof contactSchema>

type ContactDialogProps = {
  vendorId: string
  /** The contact being edited, or `null` to add one. */
  contact: VendorContact | null
  onClose: () => void
}

/** Adds a person at the vendor, or changes one. */
export function ContactDialog({ vendorId, contact, onClose }: ContactDialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? '',
      designation: contact?.designation ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      primaryContact: contact?.primaryContact ?? false,
    },
  })

  const save = useMutation({
    mutationFn: (values: ContactValues) => {
      const input = { name: values.name.trim(), designation: blankToNull(values.designation), email: values.email.trim(), phone: values.phone.trim(), primaryContact: values.primaryContact }
      return contact ? updateVendorContact(contact.id, vendorId, input) : createVendorContact(vendorId, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.contacts(vendorId) })
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title={contact ? 'Edit contact' : 'Add a contact'}
        description="Someone at the vendor you deal with."
        submitLabel={contact ? 'Save changes' : 'Add contact'}
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        submitting={save.isPending}
        error={save.error}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input placeholder="Sales manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+91 98765 43210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="primaryContact"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} onBlur={field.onBlur} ref={field.ref} />
              </FormControl>
              <FormLabel className="font-normal">The main person to contact</FormLabel>
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

const scoreSchema = z.object({
  category: z.string().min(1),
  score: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10, 'Enter a whole number, 1 to 10'),
  notes: z.string().max(2000, 'Maximum 2,000 characters'),
})
type ScoreValues = z.infer<typeof scoreSchema>

/** Rates a vendor in one category, out of 10. A new rating for a category replaces how it stood before. */
export function RateVendorDialog({ vendorId, onClose }: { vendorId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<ScoreValues>({ resolver: zodResolver(scoreSchema), defaultValues: { category: 'QUALITY', score: '', notes: '' } })

  const rate = useMutation({
    mutationFn: (values: ScoreValues) => addVendorScore(vendorId, { category: values.category, score: Number(values.score), notes: blankToNull(values.notes) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.scorecard(vendorId) })
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Rate this vendor"
        description="Rate one thing at a time. The scorecard shows the average rating."
        submitLabel="Save rating"
        size="sm"
        onSubmit={form.handleSubmit((values) => rate.mutate(values))}
        submitting={rate.isPending}
        error={rate.error}
      >
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What is being rated</FormLabel>
              <FormControl>
                <Select {...field}>
                  {VENDOR_RATING_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Score</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" min="1" max="10" step="1" placeholder="8" {...field} />
              </FormControl>
              <FormDescription>1 is poor, 10 is excellent.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Why</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Delivered two days early, one camera was faulty" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
