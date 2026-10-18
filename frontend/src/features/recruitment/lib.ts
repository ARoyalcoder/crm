import type { JobInput, JobOpening } from './api'

/** The order an application moves through. Hired is reached through its own action, rejection from any stage. */
export const STAGE_PROGRESSION = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'HIRED'] as const

/** Stages where nothing more can be done to the application. */
export function isFinishedStage(stage: string): boolean {
  return stage === 'HIRED' || stage === 'REJECTED'
}

/** The stage after this one, or `null` at the end of the line (and for a rejected application). */
export function nextStage(current: string): string | null {
  const index = (STAGE_PROGRESSION as readonly string[]).indexOf(current)
  if (index < 0 || index >= STAGE_PROGRESSION.length - 1) return null
  return STAGE_PROGRESSION[index + 1]!
}

/** A saved job as the payload the server takes, so one change (its status) can be sent without retyping the rest. */
export function jobAsInput(job: JobOpening, changes: Partial<JobInput> = {}): JobInput {
  return {
    title: job.title,
    department: job.department,
    location: job.location ?? null,
    description: job.description,
    requirements: job.requirements ?? null,
    minExperienceYears: job.minExperienceYears ?? null,
    minSalary: job.minSalary ?? null,
    maxSalary: job.maxSalary ?? null,
    status: job.status,
    postedDate: job.postedDate ?? null,
    closingDate: job.closingDate ?? null,
    ...changes,
  }
}

/** An address worth turning into a link: it has to be a real web page, never a script or a file. Anything else is `null`. */
export function webAddress(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/** `₹4,00,000 – ₹6,00,000`, `From ₹4,00,000`, `Up to ₹6,00,000`, or `null` when no pay is stated. */
export function describePay(min: number | null | undefined, max: number | null | undefined, format: (value: number) => string): string | null {
  if (min != null && max != null) return `${format(min)} – ${format(max)}`
  if (min != null) return `From ${format(min)}`
  if (max != null) return `Up to ${format(max)}`
  return null
}
