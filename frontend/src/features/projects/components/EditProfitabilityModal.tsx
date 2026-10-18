import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { formatPercent, formatRupees } from '@/lib/format'
import { projectsApi, type ProjectProfitability } from '../api'

const amount = z.string().refine((value) => value === '' || Number(value) >= 0, 'An amount cannot be negative')

const schema = z.object({
  revenue: amount,
  expectedCost: amount,
  materialCost: amount,
  labourCost: amount,
  vendorCost: amount,
  travelCost: amount,
  otherExpenses: amount,
})
type FormValues = z.infer<typeof schema>

const COSTS = [
  ['materialCost', 'Materials'],
  ['labourCost', 'Labour'],
  ['vendorCost', 'Vendors and subcontract'],
  ['travelCost', 'Travel and logistics'],
  ['otherExpenses', 'Other direct costs'],
] as const

const toNumber = (value: string) => (value === '' ? 0 : Number(value))

type EditProfitabilityModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  profitability?: ProjectProfitability
}

/** Revenue and the direct costs entered by hand. The cost and margin shown are worked out from what is typed. */
export function EditProfitabilityModal({ open, onOpenChange, projectId, profitability }: EditProfitabilityModalProps) {
  const queryClient = useQueryClient()
  const text = (value: number | undefined) => (value ? String(value) : '')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenue: text(profitability?.revenue),
      expectedCost: text(profitability?.expectedCost),
      materialCost: text(profitability?.materialCost),
      labourCost: text(profitability?.labourCost),
      vendorCost: text(profitability?.vendorCost),
      travelCost: text(profitability?.travelCost),
      otherExpenses: text(profitability?.otherExpenses),
    },
  })

  const values = useWatch({ control: form.control })
  const revenue = toNumber(values.revenue ?? '')
  const cost = COSTS.reduce((sum, [name]) => sum + toNumber(values[name] ?? ''), 0)
  const margin = revenue > 0 && cost > 0 ? ((revenue - cost) / revenue) * 100 : null

  const save = useMutation({
    mutationFn: (input: FormValues) =>
      projectsApi.updateProfitability(projectId, {
        revenue: toNumber(input.revenue),
        expectedCost: toNumber(input.expectedCost),
        materialCost: toNumber(input.materialCost),
        labourCost: toNumber(input.labourCost),
        vendorCost: toNumber(input.vendorCost),
        travelCost: toNumber(input.travelCost),
        otherExpenses: toNumber(input.otherExpenses),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
      onOpenChange(false)
    },
  })

  const field = (name: keyof FormValues, label: string) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field: props }) => (
        <FormItem>
          <FormLabel>{label} (₹)</FormLabel>
          <FormControl>
            <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" {...props} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Revenue and cost"
        submitLabel="Save figures"
        onSubmit={form.handleSubmit((input) => save.mutate(input))}
        submitting={save.isPending}
        error={save.error}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field('revenue', 'Revenue')}
          {field('expectedCost', 'Expected cost')}
        </div>
        <fieldset className="grid gap-4 rounded-xl border bg-muted/30 p-4">
          <legend className="px-1 text-sm font-medium">Cost recorded so far</legend>
          <div className="grid gap-4 sm:grid-cols-2">{COSTS.map(([name, label]) => field(name, label))}</div>
        </fieldset>
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm" aria-live="polite">
          <span>
            Cost recorded <strong className="tabular">{formatRupees(cost)}</strong>
          </span>
          <span>
            Margin <strong className="tabular">{margin === null ? '—' : formatPercent(margin)}</strong>
          </span>
        </p>
      </FormDialog>
    </Form>
  )
}
