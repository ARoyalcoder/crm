import { humanize } from '@/lib/format'

/**
 * What a status looks like, decided once for the whole product. A status is always shown with its
 * words (never colour alone); the tone only adds at-a-glance meaning:
 *
 *   success  finished or healthy      warning  needs a look soon      danger  late, lost or failed
 *   info     moving along             primary  important / hot         neutral not started, off or archived
 */
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** Tone of a status code in any module. Codes mean the same thing everywhere except where a domain overrides them. */
const TONES: Record<string, Tone> = {
  // finished, healthy
  ACTIVE: 'success',
  COMPLETED: 'success',
  COMPLETE: 'success',
  PAID: 'success',
  WON: 'success',
  APPROVED: 'success',
  ACCEPTED: 'success',
  RESOLVED: 'success',
  RECEIVED: 'success',
  VERIFIED: 'success',
  DELIVERED: 'success',
  RENEWED: 'success',
  QUALIFIED: 'success',
  GOOD: 'success',
  HIRED: 'success',
  CONNECTED: 'success',
  SUCCESS: 'success',
  SUCCEEDED: 'success',
  PRESENT: 'success',
  ONLINE: 'success',
  ENABLED: 'success',
  ON_TIME: 'success',
  PASSED: 'success',
  // moving along
  ISSUED: 'info',
  SENT: 'info',
  VIEWED: 'info',
  IN_PROGRESS: 'info',
  CONFIRMED: 'info',
  SCHEDULED: 'info',
  ASSIGNED: 'info',
  PARTIALLY_PAID: 'info',
  PARTIALLY_DELIVERED: 'info',
  OPEN: 'info',
  NEW: 'info',
  PLANNING: 'info',
  IN_REVIEW: 'info',
  SUBMITTED: 'info',
  SCREENING: 'info',
  INTERVIEW: 'info',
  OFFER: 'info',
  OFFERED: 'info',
  TRIGGERED: 'info',
  WORK_FROM_HOME: 'info',
  HALF_DAY: 'info',
  // needs a look
  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  ON_HOLD: 'warning',
  DUE_SOON: 'warning',
  EXPIRING: 'warning',
  RENEWAL_PENDING: 'warning',
  NEEDS_ATTENTION: 'warning',
  UNDER_REVIEW: 'warning',
  WAITING: 'warning',
  PROBATION: 'warning',
  MEDIUM: 'warning',
  ON_LEAVE: 'warning',
  PARTIAL: 'warning',
  // late, lost, failed
  OVERDUE: 'danger',
  LOST: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  ERROR: 'danger',
  BREACHED: 'danger',
  AT_RISK: 'danger',
  CRITICAL: 'danger',
  URGENT: 'danger',
  DISQUALIFIED: 'danger',
  EXPIRED: 'danger',
  LAPSED: 'danger',
  MISSED: 'danger',
  BLOCKED: 'danger',
  DELAYED: 'danger',
  TERMINATED: 'danger',
  SUSPENDED: 'danger',
  ABSENT: 'danger',
  REVERSED: 'danger',
  VOIDED: 'danger',
  CLAIMED: 'info',
  // not started, off, archived
  DRAFT: 'neutral',
  CANCELLED: 'neutral',
  CLOSED: 'neutral',
  INACTIVE: 'neutral',
  LOW: 'neutral',
  NOT_STARTED: 'neutral',
  NOT_DUE: 'neutral',
  NONE: 'neutral',
  ARCHIVED: 'neutral',
  NOT_CONFIGURED: 'neutral',
  DISMISSED: 'neutral',
  DISCONNECTED: 'neutral',
  DISABLED: 'neutral',
  OFFLINE: 'neutral',
  TODO: 'neutral',
  RESIGNED: 'neutral',
}

/** Where one code needs a different tone or wording in one module. */
const OVERRIDES: Record<string, Record<string, { tone?: Tone; label?: string }>> = {
  // A hot lead is good news that wants action, not an alarm.
  leadPriority: {
    HIGH: { tone: 'primary', label: 'High priority' },
    MEDIUM: { tone: 'info', label: 'Medium priority' },
    LOW: { tone: 'neutral', label: 'Low priority' },
  },
  // Urgency of work (tasks, tickets, projects).
  priority: {
    LOW: { tone: 'neutral' },
    MEDIUM: { tone: 'info' },
    HIGH: { tone: 'warning' },
    URGENT: { tone: 'danger' },
    CRITICAL: { tone: 'danger' },
  },
  // A lead or opportunity that is still open is just in play.
  leadStatus: { OPEN: { tone: 'info' } },
  // Project state names are configurable per organisation; unknown ones fall back to neutral wording.
  project: { IN_REVIEW: { tone: 'primary' }, PLANNING: { tone: 'neutral' } },
  // Overdue renewals are warnings until the contract actually lapses.
  renewal: { OVERDUE: { tone: 'danger' }, DUE_SOON: { tone: 'warning' } },
  // An unpaid invoice is neither good nor bad until it is past due.
  invoice: { ISSUED: { tone: 'info', label: 'Issued' } },
  // How far a partner organisation may see into the business.
  partnerAccess: { READ_ONLY: { tone: 'info' }, ASSIGNED_PROJECTS: { tone: 'primary' }, LIMITED_OPERATIONS: { tone: 'warning' } },
  health: { GOOD: { tone: 'success', label: 'Good' }, NEEDS_ATTENTION: { tone: 'warning' }, AT_RISK: { tone: 'danger' } },
  // A job taking applications is open for business; a paused one is waiting on someone.
  jobStatus: { OPEN: { tone: 'success' }, PAUSED: { tone: 'warning' } },
  // How far an application has got: a shortlisted candidate is a step ahead of one who has only just applied.
  applicationStage: { APPLIED: { tone: 'neutral' }, SHORTLISTED: { tone: 'primary' }, SELECTED: { tone: 'success' } },
}

export type StatusLook = { tone: Tone; label: string }

/** Tone and wording for a status code, optionally scoped to a domain ("leadPriority", "invoice", ...). */
export function statusLook(code: string | null | undefined, domain?: string): StatusLook {
  if (!code) return { tone: 'neutral', label: '—' }
  const key = code.toUpperCase().replace(/[\s-]+/g, '_')
  const override = domain ? OVERRIDES[domain]?.[key] : undefined
  return {
    tone: override?.tone ?? TONES[key] ?? 'neutral',
    label: override?.label ?? humanize(key),
  }
}
