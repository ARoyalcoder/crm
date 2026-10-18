import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmployeePicker } from '@/features/workforce/components/EmployeePicker'
import { formatDate, formatRupees, isoDate } from '@/lib/format'
import {
  VISIT_TYPES,
  addServiceVisit,
  amcKeys,
  renewAmcContract,
  updateServiceVisit,
  type AmcContractDetail,
  type VisitView,
} from '../api'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const picked = z.object({ id: z.string(), name: z.string(), hint: z.string().optional() })

/** `YYYY-MM-DD` plus a number of days or years, on the calendar (no time zone involved). */
function shiftDate(date: string, shift: { days?: number; years?: number }): string {
  const [year, month, day] = date.split('-').map(Number)
  return isoDate(new Date(year! + (shift.years ?? 0), month! - 1, day! + (shift.days ?? 0)))
}

/** What a change to a contract's visits touches: the contract's own page and the overview. */
function useRefreshContract(contractId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: amcKeys.detail(contractId) })
    void queryClient.invalidateQueries({ queryKey: amcKeys.dashboard() })
  }
}

// ─── Renew ────────────────────────────────────────────────────────────────────

function renewSchema(currentEnd: string) {
  return z
    .object({
      newEndDate: z.string().min(1, 'Choose the new end date'),
      newContractValue: z.string().refine((value) => value === '' || Number(value) >= 0, 'The value cannot be negative'),
    })
    .superRefine((values, context) => {
      if (values.newEndDate && values.newEndDate <= currentEnd) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['newEndDate'], message: `The new end date must be after ${formatDate(currentEnd)}` })
      }
    })
}

type RenewDialogProps = DialogProps & {
  contract: AmcContractDetail
  /** The renewed contract has been created; go and look at it. */
  onRenewed: (renewed: AmcContractDetail) => void
}

/** Renewing creates the next contract from the day after this one ends, and closes this one as renewed. */
export function RenewContractDialog({ contract, open, onOpenChange, onRenewed }: RenewDialogProps) {
  const queryClient = useQueryClient()
  const schema = renewSchema(contract.endDate)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { newEndDate: shiftDate(contract.endDate, { years: 1 }), newContractValue: '' },
  })

  const renew = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      renewAmcContract(contract.id, {
        newEndDate: values.newEndDate,
        newContractValue: values.newContractValue === '' ? undefined : Number(values.newContractValue),
      }),
    onSuccess: (renewed) => {
      void queryClient.invalidateQueries({ queryKey: amcKeys.all })
      onRenewed(renewed)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Renew this contract"
        description={`A new contract starts on ${formatDate(shiftDate(contract.endDate, { days: 1 }))}, the day after this one ends. This one closes as renewed.`}
        submitLabel="Renew contract"
        onSubmit={form.handleSubmit((values) => renew.mutate(values))}
        submitting={renew.isPending}
        error={renew.error}
      >
        <FormField
          control={form.control}
          name="newEndDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New end date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newContractValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New contract value</FormLabel>
              <FormControl>
                <Input type="number" inputMode="decimal" step="0.01" min="0" placeholder={String(contract.contractValue)} {...field} />
              </FormControl>
              <FormDescription>Leave empty to keep {formatRupees(contract.contractValue)}.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Schedule a visit ─────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  scheduledDate: z.string().min(1, 'Choose the day of the visit'),
  visitType: z.enum(['SCHEDULED', 'EMERGENCY', 'INSPECTION']),
  employee: picked.nullable(),
  notes: z.string(),
})
type ScheduleValues = z.infer<typeof scheduleSchema>

/** Puts a visit in the diary: when, what kind, who goes, and what to look at. */
export function ScheduleVisitDialog({ contract, open, onOpenChange }: DialogProps & { contract: AmcContractDetail }) {
  const refresh = useRefreshContract(contract.id)
  const form = useForm<ScheduleValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduledDate: '',
      visitType: 'SCHEDULED',
      // The person looking after the contract is the natural default; it can be changed.
      employee: contract.assignedEmployeeId ? { id: contract.assignedEmployeeId, name: contract.assignedEmployeeName ?? 'Employee' } : null,
      notes: '',
    },
  })

  const schedule = useMutation({
    mutationFn: (values: ScheduleValues) =>
      addServiceVisit(contract.id, {
        scheduledDate: values.scheduledDate,
        visitType: values.visitType,
        assignedEmployeeId: values.employee?.id,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: () => {
      refresh()
      onOpenChange(false)
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Schedule a visit"
        description={`For contract ${contract.contractNumber}${contract.customerName ? `, ${contract.customerName}` : ''}.`}
        submitLabel="Schedule visit"
        onSubmit={form.handleSubmit((values) => schedule.mutate(values))}
        submitting={schedule.isPending}
        error={schedule.error}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" min={contract.startDate} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="visitType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kind of visit</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {VISIT_TYPES.map((option) => (
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
        </div>
        <EntityPickerField control={form.control} name="employee" label="Who goes">
          {(field) => <EmployeePicker {...field} />}
        </EntityPickerField>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="What to check or bring" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Complete a visit ─────────────────────────────────────────────────────────

const completeSchema = z.object({
  completedDate: z
    .string()
    .min(1, 'Choose the visit date')
    .refine((value) => value <= isoDate(new Date()), 'A visit cannot be completed in the future'),
  outcome: z.string(),
})
type CompleteValues = z.infer<typeof completeSchema>

/** Records that a visit took place, when, and how it went. */
export function CompleteVisitDialog({ visit, contractId, onClose }: { visit: VisitView; contractId: string; onClose: () => void }) {
  const refresh = useRefreshContract(contractId)
  const form = useForm<CompleteValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { completedDate: isoDate(new Date()), outcome: '' },
  })

  const complete = useMutation({
    mutationFn: (values: CompleteValues) =>
      updateServiceVisit(visit.id, { status: 'COMPLETED', completedDate: values.completedDate, outcome: values.outcome.trim() || undefined }),
    onSuccess: () => {
      refresh()
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Complete this visit"
        description={`Planned for ${formatDate(visit.scheduledDate)}.`}
        submitLabel="Mark as completed"
        onSubmit={form.handleSubmit((values) => complete.mutate(values))}
        submitting={complete.isPending}
        error={complete.error}
      >
        <FormField
          control={form.control}
          name="completedDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Done on</FormLabel>
              <FormControl>
                <Input type="date" max={isoDate(new Date())} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How it went</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="What was done, what was found, anything to follow up" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
