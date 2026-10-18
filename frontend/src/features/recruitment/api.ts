import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api/client'
import { queryString } from '@/lib/api/page'

const noContent = z.undefined()

// ------------------------------------------------------------------ constants

export const JOB_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
] as const

export const APPLICATION_STAGES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SCREENING', label: 'Screening' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'HIRED', label: 'Hired' },
] as const

export const INTERVIEW_TYPES = [
  { value: 'PHONE', label: 'Phone' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'HR', label: 'HR' },
] as const

export function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((o) => o.value === value)?.label ?? value ?? '—'
}

// ------------------------------------------------------------------ schemas

const jobOpeningSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  title: z.string(),
  department: z.string(),
  location: z.string().nullish(),
  description: z.string(),
  requirements: z.string().nullish(),
  minExperienceYears: z.number().nullish(),
  minSalary: z.number().nullish(),
  maxSalary: z.number().nullish(),
  status: z.string(),
  postedDate: z.string().nullish(),
  closingDate: z.string().nullish(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
  /** How many people applied. Sent with the list and the single job, not when a job has just been saved. */
  applicationCount: z.number().nullish(),
})
export type JobOpening = z.infer<typeof jobOpeningSchema>

const candidateSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  location: z.string().nullish(),
  experienceYears: z.number().nullish(),
  currentSalary: z.number().nullish(),
  expectedSalary: z.number().nullish(),
  noticePeriodDays: z.number().nullish(),
  resumeStorageKey: z.string().nullish(),
  resumeFileName: z.string().nullish(),
  linkedInUrl: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
})
export type Candidate = z.infer<typeof candidateSchema>

const applicationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  jobId: z.string(),
  candidateId: z.string(),
  stage: z.string(),
  appliedDate: z.string(),
  assignedToUserId: z.string().nullish(),
  stageNotes: z.string().nullish(),
  rejectionReason: z.string().nullish(),
  offerSalary: z.number().nullish(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number(),
  // The names behind the ids, so lists can say who applied for what without a lookup per row.
  candidateName: z.string().nullish(),
  jobTitle: z.string().nullish(),
  assignedToName: z.string().nullish(),
})
export type Application = z.infer<typeof applicationSchema>

const interviewSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  applicationId: z.string(),
  interviewType: z.string(),
  scheduledAt: z.string(),
  durationMinutes: z.number().nullish(),
  interviewerUserId: z.string(),
  location: z.string().nullish(),
  notes: z.string().nullish(),
  feedback: z.string().nullish(),
  rating: z.number().nullish(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  interviewerName: z.string().nullish(),
})
export type Interview = z.infer<typeof interviewSchema>

const applicationDetailSchema = z.object({
  application: applicationSchema,
  candidate: candidateSchema,
  job: jobOpeningSchema,
  interviews: z.array(interviewSchema),
})
export type ApplicationDetail = z.infer<typeof applicationDetailSchema>

// ------------------------------------------------------------------ query keys

export const recruitmentKeys = {
  jobs: ['recruitment', 'jobs'] as const,
  job: (id: string) => ['recruitment', 'jobs', id] as const,
  jobApplications: (id: string) => ['recruitment', 'jobs', id, 'applications'] as const,
  candidates: ['recruitment', 'candidates'] as const,
  candidate: (id: string) => ['recruitment', 'candidates', id] as const,
  candidateApplications: (id: string) => ['recruitment', 'candidates', id, 'applications'] as const,
  application: (id: string) => ['recruitment', 'applications', id] as const,
  interview: (id: string) => ['recruitment', 'interviews', id] as const,
}

// ------------------------------------------------------------------ job openings

export function jobsQuery(status?: string) {
  return queryOptions({
    queryKey: [...recruitmentKeys.jobs, status ?? 'all'],
    queryFn: ({ signal }) =>
      apiRequest(`/jobs${status ? queryString({ status }) : ''}`, z.array(jobOpeningSchema), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function jobQuery(id: string) {
  return queryOptions({
    queryKey: recruitmentKeys.job(id),
    queryFn: ({ signal }) => apiRequest(`/jobs/${id}`, jobOpeningSchema, { signal }),
  })
}

export type JobInput = {
  title: string
  department: string
  location: string | null
  description: string
  requirements: string | null
  minExperienceYears: number | null
  minSalary: number | null
  maxSalary: number | null
  status: string
  postedDate: string | null
  closingDate: string | null
}

export function createJob(input: JobInput) {
  return apiRequest('/jobs', jobOpeningSchema, { method: 'POST', body: input })
}

export function updateJob(id: string, input: JobInput) {
  return apiRequest(`/jobs/${id}`, jobOpeningSchema, { method: 'PUT', body: input })
}

export function deleteJob(id: string) {
  return apiRequest(`/jobs/${id}`, noContent, { method: 'DELETE' })
}

export function jobApplicationsQuery(jobId: string, stage?: string) {
  return queryOptions({
    queryKey: [...recruitmentKeys.jobApplications(jobId), stage ?? 'all'],
    queryFn: ({ signal }) =>
      apiRequest(
        `/jobs/${jobId}/applications${stage ? queryString({ stage }) : ''}`,
        z.array(applicationSchema),
        { signal },
      ),
  })
}

// ------------------------------------------------------------------ candidates

export function candidatesQuery(search?: string) {
  return queryOptions({
    queryKey: [...recruitmentKeys.candidates, search ?? ''],
    queryFn: ({ signal }) =>
      apiRequest(
        `/candidates${search ? queryString({ search }) : ''}`,
        z.array(candidateSchema),
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
}

export function candidateQuery(id: string) {
  return queryOptions({
    queryKey: recruitmentKeys.candidate(id),
    queryFn: ({ signal }) => apiRequest(`/candidates/${id}`, candidateSchema, { signal }),
  })
}

export type CandidateInput = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  location: string | null
  experienceYears: number | null
  currentSalary: number | null
  expectedSalary: number | null
  noticePeriodDays: number | null
  resumeStorageKey: string | null
  resumeFileName: string | null
  linkedInUrl: string | null
  notes: string | null
}

export function createCandidate(input: CandidateInput) {
  return apiRequest('/candidates', candidateSchema, { method: 'POST', body: input })
}

export function updateCandidate(id: string, input: CandidateInput) {
  return apiRequest(`/candidates/${id}`, candidateSchema, { method: 'PUT', body: input })
}

export function candidateApplicationsQuery(candidateId: string) {
  return queryOptions({
    queryKey: recruitmentKeys.candidateApplications(candidateId),
    queryFn: ({ signal }) =>
      apiRequest(`/candidates/${candidateId}/applications`, z.array(applicationSchema), { signal }),
  })
}

// ------------------------------------------------------------------ applications

export function applicationQuery(id: string) {
  return queryOptions({
    queryKey: recruitmentKeys.application(id),
    queryFn: ({ signal }) => apiRequest(`/applications/${id}`, applicationDetailSchema, { signal }),
  })
}

export type CreateApplicationInput = {
  jobId: string
  candidateId: string
  appliedDate: string | null
  assignedToUserId: string | null
  stageNotes: string | null
}

export function createApplication(input: CreateApplicationInput) {
  return apiRequest('/applications', applicationSchema, { method: 'POST', body: input })
}

export function advanceStage(id: string, stage: string, notes: string | null) {
  return apiRequest(`/applications/${id}/stage`, applicationSchema, {
    method: 'PUT',
    body: { stage, notes },
  })
}

export function hireApplication(id: string) {
  return apiRequest(`/applications/${id}/hire`, applicationSchema, { method: 'PUT' })
}

export function rejectApplication(id: string, reason: string | null) {
  return apiRequest(`/applications/${id}/reject`, applicationSchema, {
    method: 'PUT',
    body: { reason },
  })
}

// ------------------------------------------------------------------ interviews

export function interviewQuery(id: string) {
  return queryOptions({
    queryKey: recruitmentKeys.interview(id),
    queryFn: ({ signal }) => apiRequest(`/interviews/${id}`, interviewSchema, { signal }),
  })
}

export type ScheduleInterviewInput = {
  interviewType: string
  scheduledAt: string
  durationMinutes: number | null
  interviewerUserId: string
  location: string | null
  notes: string | null
}

export function scheduleInterview(applicationId: string, input: ScheduleInterviewInput) {
  return apiRequest(`/applications/${applicationId}/interviews`, interviewSchema, {
    method: 'POST',
    body: input,
  })
}

export function updateInterview(id: string, input: ScheduleInterviewInput) {
  return apiRequest(`/interviews/${id}`, interviewSchema, { method: 'PUT', body: input })
}

export function completeInterview(id: string, feedback: string | null, rating: number | null) {
  return apiRequest(`/interviews/${id}/complete`, interviewSchema, {
    method: 'PUT',
    body: { feedback, rating },
  })
}

export function cancelInterview(id: string) {
  return apiRequest(`/interviews/${id}`, noContent, { method: 'DELETE' })
}
