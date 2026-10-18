import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, blankToNull } from '@/lib/forms'
import { VENDOR_STATUSES, createVendor, updateVendor, vendorKeys, vendorQuery } from '../api'

/** The same rule as the server: a plus or digit, then digits, spaces, brackets and dashes. */
const PHONE = /^[+0-9][0-9 ()-]{5,28}$/

const schema = z.object({
  companyName: z.string().trim().min(1, 'Enter the company name').max(200, 'Maximum 200 characters'),
  contactEmail: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  contactPhone: z.string().trim().min(1, 'Enter a phone number').regex(PHONE, 'Enter a valid phone, e.g. +91 98765 43210'),
  address: z.string().max(2000, 'Maximum 2,000 characters'),
  services: z.string().max(2000, 'Keep this under 2,000 characters'),
  paymentTermsDays: z.string().refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 365), 'Enter whole days, 1 to 365'),
  status: z.string().min(1),
  notes: z.string().max(4000, 'Maximum 4,000 characters'),
})
type FormValues = z.infer<typeof schema>

/** Adds a vendor or edits one: who they are, how to reach them, what they supply and the payment terms agreed. */
export function VendorFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [failure, setFailure] = useState<string | null>(null)

  const existing = useQuery({ ...vendorQuery(id!), enabled: isEdit })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing.data
      ? {
          companyName: existing.data.companyName,
          contactEmail: existing.data.contactEmail,
          contactPhone: existing.data.contactPhone,
          address: existing.data.address ?? '',
          services: existing.data.services ?? '',
          paymentTermsDays: existing.data.paymentTermsDays != null ? String(existing.data.paymentTermsDays) : '',
          status: existing.data.status,
          notes: existing.data.notes ?? '',
        }
      : undefined,
    defaultValues: { companyName: '', contactEmail: '', contactPhone: '', address: '', services: '', paymentTermsDays: '', status: 'ACTIVE', notes: '' },
  })

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input = {
        companyName: values.companyName.trim(),
        contactEmail: values.contactEmail.trim(),
        contactPhone: values.contactPhone.trim(),
        address: blankToNull(values.address),
        services: blankToNull(values.services),
        paymentTermsDays: values.paymentTermsDays === '' ? null : Number(values.paymentTermsDays),
        status: values.status,
        notes: blankToNull(values.notes),
      }
      return isEdit && existing.data ? updateVendor(id!, { ...input, version: existing.data.version }) : createVendor(input)
    },
    onSuccess: (vendor) => {
      void queryClient.invalidateQueries({ queryKey: vendorKeys.all })
      navigate(`/vendors/${vendor.id}`)
    },
    onError: (error) => setFailure(applyServerErrors(form, error)),
  })

  if (isEdit && existing.isPending) return <SkeletonLoader variant="page" label="Loading the vendor" />
  if (isEdit && existing.isError) return <ErrorState title="Could not load this vendor" error={existing.error} onRetry={() => void existing.refetch()} />

  const text = (name: keyof FormValues, label: string, props: { type?: string; placeholder?: string; description?: string } = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={props.type} placeholder={props.placeholder} {...field} />
          </FormControl>
          {props.description ? <FormDescription>{props.description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title={isEdit ? 'Edit vendor' : 'Add a vendor'}
        back={{ to: isEdit ? `/vendors/${id}` : '/vendors', label: isEdit ? 'Vendor' : 'Vendors' }}
        description="A supplier or subcontractor the business buys from."
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            setFailure(null)
            save.mutate(values)
          })}
          className="grid gap-4"
          noValidate
        >
          {failure ? (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm">
              {failure}
            </p>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Who they are</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{text('companyName', 'Company name')}</div>
              {text('contactEmail', 'Email', { type: 'email' })}
              {text('contactPhone', 'Phone', { type: 'tel', placeholder: '+91 98765 43210' })}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What they supply</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">{text('services', 'Services and goods', { placeholder: 'Cameras, cabling, civil work' })}</div>
              {text('paymentTermsDays', 'Payment terms (days)', { type: 'number', placeholder: '30', description: 'Days after an invoice before payment is expected.' })}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        {VENDOR_STATUSES.map((option) => (
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
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="For your team only" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to={isEdit ? `/vendors/${id}` : '/vendors'}>Cancel</Link>
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Add vendor'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
