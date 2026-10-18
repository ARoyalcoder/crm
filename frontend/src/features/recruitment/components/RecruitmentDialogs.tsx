import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { EntityPickerField } from '@/components/shared/EntityPickerField'
import { FormDialog } from '@/components/shared/FormDialog'
import { pickedOption } from '@/components/shared/picker-schema'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmployeePicker } from '@/features/workforce/components/EmployeePicker'
import { blankToNull } from '@/lib/forms'
import { isoDate } from '@/lib/format'
import {
  INTERVIEW_TYPES,
  advanceStage,
  completeInterview,
  createApplication,
  labelOf,
  rejectApplication,
  scheduleInterview,
  updateInterview,
  APPLICATION_STAGES,
  type Interview,
} from '../api'
import { CandidatePicker } from './CandidatePicker'
import { JobPicker } from './JobPicker'

/** Everything on screen that depends on applications: both lists, the job counts and the application itself. */
function useRefreshRecruitment() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['recruitment'] })
}

// ─── Add an application ──────────────────────────────────────────────────────

const applicationSchema = z.object({
  job: pickedOption.nullable(),
  candidate: pickedOption.nullable(),
  assignee: pickedOption.nullable(),
  appliedDate: z.string().refine((value) => value === '' || value <= isoDate(new Date()), 'Application date cannot be in the future'),
  notes: z.string().max(2000, 'Maximum 2,000 characters'),
})
type ApplicationValues = z.infer<typeof applicationSchema>

type AddApplicationProps = {
  /** Set when adding from a job: only the candidate is chosen. */
  job?: { id: string; title: string }
  /** Set when adding from a candidate: only the job is chosen. */
  candidate?: { id: string; name: string }
  onClose: () => void
}

/** Puts a candidate forward for a job. A candidate can apply to a job once. */
export function AddApplicationDialog({ job, candidate, onClose }: AddApplicationProps) {
  const refresh = useRefreshRecruitment()
  const schema = useMemo(
    () =>
      applicationSchema.superRefine((values, context) => {
        if (!job && !values.job) context.addIssue({ code: z.ZodIssueCode.custom, path: ['job'], message: 'Choose the job' })
        if (!candidate && !values.candidate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['candidate'], message: 'Choose the candidate' })
      }),
    [job, candidate],
  )
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(schema),
    defaultValues: { job: null, candidate: null, assignee: null, appliedDate: isoDate(new Date()), notes: '' },
  })

  const add = useMutation({
    mutationFn: (values: ApplicationValues) =>
      createApplication({
        jobId: job?.id ?? values.job!.id,
        candidateId: candidate?.id ?? values.candidate!.id,
        appliedDate: values.appliedDate || null,
        assignedToUserId: values.assignee?.data?.userId ?? null,
        stageNotes: blankToNull(values.notes),
      }),
    onSuccess: () => {
      refresh()
      toast.success('Application added')
      onClose()
    },
  })

  const subject = [job ? `for ${job.title}` : null, candidate ? `from ${candidate.name}` : null].filter(Boolean).join(' ')

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Add an application"
        description={subject ? `An application ${subject}.` : 'Put a candidate forward for an open job.'}
        submitLabel="Add application"
        onSubmit={form.handleSubmit((values) => add.mutate(values))}
        submitting={add.isPending}
        error={add.error}
      >
        {job ? null : (
          <EntityPickerField control={form.control} name="job" label="Job" required>
            {(field) => <JobPicker {...field} />}
          </EntityPickerField>
        )}
        {candidate ? null : (
          <EntityPickerField control={form.control} name="candidate" label="Candidate" required>
            {(field) => <CandidatePicker {...field} />}
          </EntityPickerField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="appliedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Applied on</FormLabel>
                <FormControl>
                  <Input type="date" max={isoDate(new Date())} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <EntityPickerField control={form.control} name="assignee" label="Looked after by">
            {(field) => <EmployeePicker {...field} />}
          </EntityPickerField>
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Where they were found, who referred them" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Move to the next stage ──────────────────────────────────────────────────

const notesSchema = z.object({ notes: z.string().max(2000, 'Maximum 2,000 characters') })
type NotesValues = z.infer<typeof notesSchema>

/** Moves an application one stage on, with an optional note about why. */
export function AdvanceStageDialog({ applicationId, candidateName, to, onClose }: { applicationId: string; candidateName: string; to: string; onClose: () => void }) {
  const refresh = useRefreshRecruitment()
  const form = useForm<NotesValues>({ resolver: zodResolver(notesSchema), defaultValues: { notes: '' } })
  const stage = labelOf(APPLICATION_STAGES, to)

  const advance = useMutation({
    mutationFn: (values: NotesValues) => advanceStage(applicationId, to, blankToNull(values.notes)),
    onSuccess: () => {
      refresh()
      toast.success(`${candidateName} moved to ${stage}`)
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title={`Move to ${stage}`}
        description={`${candidateName} moves on to the ${stage.toLowerCase()} stage. An application cannot be moved back.`}
        submitLabel={`Move to ${stage}`}
        size="sm"
        onSubmit={form.handleSubmit((values) => advance.mutate(values))}
        submitting={advance.isPending}
        error={advance.error}
      >
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note for this stage</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="What was decided and why" {...field} />
              </FormControl>
              <FormDescription>Optional. Shown on the application until the next move.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Reject ──────────────────────────────────────────────────────────────────

const reasonSchema = z.object({ reason: z.string().max(2000, 'Maximum 2,000 characters') })
type ReasonValues = z.infer<typeof reasonSchema>

/** Turns an application down, with the reason kept on record. */
export function RejectApplicationDialog({ applicationId, candidateName, onClose }: { applicationId: string; candidateName: string; onClose: () => void }) {
  const refresh = useRefreshRecruitment()
  const form = useForm<ReasonValues>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } })

  const reject = useMutation({
    mutationFn: (values: ReasonValues) => rejectApplication(applicationId, blankToNull(values.reason)),
    onSuccess: () => {
      refresh()
      toast.success(`${candidateName}'s application was rejected`)
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Reject this application"
        description={`${candidateName} will no longer be considered for this job. This cannot be undone.`}
        submitLabel="Reject application"
        destructive
        size="sm"
        onSubmit={form.handleSubmit((values) => reject.mutate(values))}
        submitting={reject.isPending}
        error={reject.error}
      >
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Why this application is being turned down" {...field} />
              </FormControl>
              <FormDescription>Optional, and kept on the application.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Schedule or reschedule an interview ─────────────────────────────────────

/** An ISO instant as the `YYYY-MM-DDTHH:mm` a date-time box takes, on the local clock. */
function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Tomorrow at ten in the morning: a sensible starting point for a new interview. */
function tomorrowMorning(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  return toLocalInput(date.toISOString())
}

const interviewSchema = z
  .object({
    interviewType: z.string().min(1),
    startsAt: z.string().min(1, 'Choose the date and time'),
    duration: z.string().refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 5 && Number(value) <= 480), 'Enter whole minutes, 5 to 480'),
    interviewer: pickedOption.nullable(),
    location: z.string().max(500, 'Maximum 500 characters'),
    notes: z.string().max(2000, 'Maximum 2,000 characters'),
  })
  .superRefine((values, context) => {
    if (!values.interviewer?.data?.userId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['interviewer'], message: 'Choose who takes the interview' })
    }
  })
type InterviewValues = z.infer<typeof interviewSchema>

/** Sets up an interview for an application, or moves one that has not happened yet. */
export function ScheduleInterviewDialog({ applicationId, candidateName, interview, onClose }: { applicationId: string; candidateName: string; interview?: Interview; onClose: () => void }) {
  const refresh = useRefreshRecruitment()
  const form = useForm<InterviewValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      interviewType: interview?.interviewType ?? 'VIDEO',
      startsAt: interview ? toLocalInput(interview.scheduledAt) : tomorrowMorning(),
      duration: interview?.durationMinutes != null ? String(interview.durationMinutes) : '45',
      // The picker holds an employee; an interview only keeps the person's user id, which is all the form reads.
      interviewer: interview ? { id: interview.interviewerUserId, name: interview.interviewerName ?? 'The interviewer', data: { userId: interview.interviewerUserId } } : null,
      location: interview?.location ?? '',
      notes: interview?.notes ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: InterviewValues) => {
      const input = {
        interviewType: values.interviewType,
        scheduledAt: new Date(values.startsAt).toISOString(),
        durationMinutes: values.duration === '' ? null : Number(values.duration),
        interviewerUserId: values.interviewer!.data!.userId!,
        location: blankToNull(values.location),
        notes: blankToNull(values.notes),
      }
      return interview ? updateInterview(interview.id, input) : scheduleInterview(applicationId, input)
    },
    onSuccess: () => {
      refresh()
      toast.success(interview ? 'Interview rescheduled' : 'Interview scheduled')
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title={interview ? 'Reschedule the interview' : 'Schedule an interview'}
        description={`With ${candidateName}.`}
        submitLabel={interview ? 'Save changes' : 'Schedule interview'}
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        submitting={save.isPending}
        error={save.error}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="interviewType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kind of interview</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {INTERVIEW_TYPES.map((option) => (
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
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Length (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min="5" max="480" step="5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date and time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <EntityPickerField control={form.control} name="interviewer" label="Taken by" required>
          {(field) => <EmployeePicker {...field} />}
        </EntityPickerField>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Where</FormLabel>
              <FormControl>
                <Input placeholder="Meeting link, office or phone number" {...field} />
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="What to cover" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}

// ─── Complete an interview ───────────────────────────────────────────────────

const RATINGS = [
  { value: '1', label: '1 – Poor' },
  { value: '2', label: '2 – Below expectations' },
  { value: '3', label: '3 – Meets expectations' },
  { value: '4', label: '4 – Strong' },
  { value: '5', label: '5 – Outstanding' },
]

const completeSchema = z.object({
  feedback: z.string().max(4000, 'Maximum 4,000 characters'),
  rating: z.string(),
})
type CompleteValues = z.infer<typeof completeSchema>

/** Records that an interview took place, how it went and a rating out of five. */
export function CompleteInterviewDialog({ interview, candidateName, onClose }: { interview: Interview; candidateName: string; onClose: () => void }) {
  const refresh = useRefreshRecruitment()
  const form = useForm<CompleteValues>({ resolver: zodResolver(completeSchema), defaultValues: { feedback: '', rating: '' } })

  const complete = useMutation({
    mutationFn: (values: CompleteValues) => completeInterview(interview.id, blankToNull(values.feedback), values.rating === '' ? null : Number(values.rating)),
    onSuccess: () => {
      refresh()
      toast.success('Interview marked as done')
      onClose()
    },
  })

  return (
    <Form {...form}>
      <FormDialog
        open
        onOpenChange={(open) => (open ? undefined : onClose())}
        title="Mark the interview as done"
        description={`${labelOf(INTERVIEW_TYPES, interview.interviewType)} interview with ${candidateName}.`}
        submitLabel="Mark as done"
        onSubmit={form.handleSubmit((values) => complete.mutate(values))}
        submitting={complete.isPending}
        error={complete.error}
      >
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="">No rating</option>
                  {RATINGS.map((option) => (
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
        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="Strengths, concerns and whether to go ahead" {...field} />
              </FormControl>
              <FormDescription>Once saved, an interview cannot be rescheduled or cancelled.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </Form>
  )
}
