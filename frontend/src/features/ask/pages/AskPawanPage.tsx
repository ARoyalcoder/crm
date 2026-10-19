import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Headphones,
  HardHat,
  MessageSquareText,
  Send,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ApiError } from '@/lib/api/errors'
import { ask, askSuggestionsQuery, type AskResponse } from '@/features/ask/api'
import { formatNumber } from '@/lib/format'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

type Turn = {
  id: number
  question: string
  state: 'pending' | 'answered' | 'failed'
  response?: AskResponse
  error?: string
  roleAtTurn?: string
}

type RolePreset = {
  key: string
  label: string
  shortTitle: string
  description: string
  icon: LucideIcon
  colorClass: string
  badgeClass: string
  focusAreas: string[]
  actions: {
    label: string
    prompt: string
    actionUrl?: string
    actionName?: string
    icon: LucideIcon
  }[]
}

const ROLE_PRESETS: Record<string, RolePreset> = {
  EXECUTIVE: {
    key: 'EXECUTIVE',
    label: 'Executive / Director',
    shortTitle: 'Executive View',
    description: 'Enterprise revenue, cross-vertical operational risks, delivery velocity & cashflow.',
    icon: Compass,
    colorClass: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    badgeClass: 'bg-blue-600 text-white',
    focusAreas: ['Enterprise Vitals', 'All 6 Verticals', 'P&L Health', 'Risk Oversight'],
    actions: [
      {
        label: 'Revenue & Collections Vitals',
        prompt: 'How much did we invoice and collect this month?',
        actionUrl: '/receivables',
        actionName: 'Open Receivables',
        icon: CreditCard,
      },
      {
        label: 'Total Deals Pipeline Value',
        prompt: 'What is the value of our open deals?',
        actionUrl: '/opportunities',
        actionName: 'Open Pipeline',
        icon: TrendingUp,
      },
      {
        label: 'Delayed Projects Health',
        prompt: 'Which projects are delayed?',
        actionUrl: '/projects',
        actionName: 'Review Projects',
        icon: FolderKanban,
      },
      {
        label: 'Overdue Invoices Across Clients',
        prompt: 'Which invoices are overdue?',
        actionUrl: '/finance/ageing',
        actionName: 'Aging Report',
        icon: Clock,
      },
    ],
  },
  SALES: {
    key: 'SALES',
    label: 'Sales & Business Development',
    shortTitle: 'Sales View',
    description: 'Lead conversions, deal stages, client quotations & pipeline acceleration.',
    icon: Target,
    colorClass: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
    badgeClass: 'bg-orange-600 text-white',
    focusAreas: ['Lead Scoring', 'Deal Pipeline', 'Client Quotations', 'Follow-up Cadence'],
    actions: [
      {
        label: 'Open Qualified Leads',
        prompt: 'Show open leads',
        actionUrl: '/leads',
        actionName: 'View Leads Registry',
        icon: Target,
      },
      {
        label: 'Active Pipeline Valuation',
        prompt: 'What is the value of our open deals?',
        actionUrl: '/opportunities',
        actionName: 'Deals Pipeline',
        icon: TrendingUp,
      },
      {
        label: 'Today’s Client Follow-ups',
        prompt: 'What are my tasks today?',
        actionUrl: '/activities',
        actionName: 'Action Tasks',
        icon: Calendar,
      },
      {
        label: 'Expiring AMC Contracts to Renew',
        prompt: 'Which AMC contracts expire soon?',
        actionUrl: '/amc-contracts',
        actionName: 'AMC Renewals',
        icon: ShieldCheck,
      },
    ],
  },
  FINANCE: {
    key: 'FINANCE',
    label: 'Finance & Accounts',
    shortTitle: 'Finance View',
    description: 'Receivables, billing collection, 30/60/90+ day debtor aging & reconciliation.',
    icon: CreditCard,
    colorClass: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    badgeClass: 'bg-emerald-600 text-white',
    focusAreas: ['Invoicing', 'Payment Tracking', 'DSO Recovery', 'Aging Buckets'],
    actions: [
      {
        label: 'Overdue Client Invoices',
        prompt: 'Which invoices are overdue?',
        actionUrl: '/invoices',
        actionName: 'Invoices Dashboard',
        icon: FileText,
      },
      {
        label: 'Month-to-Date Collections',
        prompt: 'How much did we invoice and collect this month?',
        actionUrl: '/payments',
        actionName: 'View Payments',
        icon: CreditCard,
      },
      {
        label: 'High-Risk Receivables',
        prompt: 'Which accounts have the highest pending receivables?',
        actionUrl: '/receivables',
        actionName: 'Receivables Board',
        icon: Clock,
      },
      {
        label: 'Review Invoicing Tasks',
        prompt: 'What are my tasks today?',
        actionUrl: '/finance/ageing',
        actionName: 'Aging Overview',
        icon: Calendar,
      },
    ],
  },
  PROJECTS: {
    key: 'PROJECTS',
    label: 'Project Management & Engineering',
    shortTitle: 'Projects View',
    description: 'Milestone tracking, installation delivery deadlines, BOQs & technical designs.',
    icon: FolderKanban,
    colorClass: 'text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    badgeClass: 'bg-cyan-600 text-white',
    focusAreas: ['Delayed Milestones', 'Site Surveys', 'Delivery Analytics', 'Handover Signoff'],
    actions: [
      {
        label: 'Critical Delayed Projects',
        prompt: 'Which projects are delayed?',
        actionUrl: '/projects',
        actionName: 'Projects Registry',
        icon: FolderKanban,
      },
      {
        label: 'Delivery Performance Analytics',
        prompt: 'What is our delivery analytics status?',
        actionUrl: '/project-analytics',
        actionName: 'Delivery Analytics',
        icon: TrendingUp,
      },
      {
        label: 'Scheduled Field Jobs',
        prompt: 'What are my tasks today?',
        actionUrl: '/field-jobs',
        actionName: 'Field Operations',
        icon: Truck,
      },
    ],
  },
  OPERATIONS: {
    key: 'OPERATIONS',
    label: 'Field Technician & Service Operations',
    shortTitle: 'Field Ops',
    description: 'Assigned customer site jobs, camera/solar installation steps & completion proof.',
    icon: HardHat,
    colorClass: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    badgeClass: 'bg-amber-600 text-white',
    focusAreas: ['Assigned Site Jobs', 'Material Checklists', 'Work Execution', 'Proof of Work'],
    actions: [
      {
        label: 'Today’s Assigned Field Jobs',
        prompt: 'What are my tasks today?',
        actionUrl: '/my-jobs',
        actionName: 'My Field Jobs',
        icon: HardHat,
      },
      {
        label: 'Upcoming Service & Installation Schedule',
        prompt: 'What are my tasks today?',
        actionUrl: '/activities',
        actionName: 'Activities Calendar',
        icon: Calendar,
      },
    ],
  },
  SUPPORT: {
    key: 'SUPPORT',
    label: 'Customer Support & AMC Care',
    shortTitle: 'Support View',
    description: 'Ticket SLA tracking, warranty validations, AMC renewals & customer issue resolution.',
    icon: Headphones,
    colorClass: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    badgeClass: 'bg-rose-600 text-white',
    focusAreas: ['SLA Compliance', 'Ticket Resolution', 'AMC Expirations', 'Warranty Health'],
    actions: [
      {
        label: 'High Priority Support Tickets',
        prompt: 'Show open support tickets',
        actionUrl: '/support/tickets',
        actionName: 'Tickets Helpdesk',
        icon: Headphones,
      },
      {
        label: 'Expiring AMC Contracts',
        prompt: 'Which AMC contracts expire soon?',
        actionUrl: '/amc-contracts',
        actionName: 'AMC Contracts',
        icon: ShieldCheck,
      },
      {
        label: 'Warranties Awaiting Check',
        prompt: 'Which warranties are pending resolution?',
        actionUrl: '/warranties',
        actionName: 'Warranties Board',
        icon: Shield,
      },
    ],
  },
  HR: {
    key: 'HR',
    label: 'Human Resources & Workforce',
    shortTitle: 'HR View',
    description: 'Daily attendance registry, leave balance requests & staff allocation.',
    icon: Users,
    colorClass: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    badgeClass: 'bg-purple-600 text-white',
    focusAreas: ['Daily Attendance', 'Leave Approvals', 'Staff Directory', 'Shift Performance'],
    actions: [
      {
        label: 'Staff Attendance Registry',
        prompt: 'What are my tasks today?',
        actionUrl: '/workforce/attendance',
        actionName: 'Attendance Log',
        icon: Calendar,
      },
      {
        label: 'Workforce Employees Directory',
        prompt: 'Show workforce employees',
        actionUrl: '/workforce/employees',
        actionName: 'Employees Directory',
        icon: UserCheck,
      },
    ],
  },
}

function sanitizeSafePath(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  // Must start with '/' and not '//' or '/\' to prevent protocol-relative redirects
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null
  }
  // Reject control characters, quotes, angle brackets, or pseudo-protocol payloads
  if (/[<>'"\s\x00-\x1f]/.test(trimmed) || /^\/(?:javascript|data|vbscript):/i.test(trimmed)) {
    return null
  }
  return trimmed
}

function Answer({ turn }: { turn: Turn }) {
  if (turn.state === 'pending') {
    return (
      <div className="grid gap-2.5 p-1" role="status" aria-label="Working out the answer">
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="size-3.5 animate-spin" />
          <span>PAWAN is analyzing records according to your role...</span>
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  }
  if (turn.state === 'failed') {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-semibold">Action Request Failed</p>
        <p className="mt-0.5 text-xs opacity-90">{turn.error ?? 'Unable to complete this role action. Please verify permissions or try again.'}</p>
      </div>
    )
  }
  const response = turn.response!
  const shown = response.supportingRecords.length
  const safeActionUrl = sanitizeSafePath(response.recommendedActionUrl)

  return (
    <div className="grid gap-3.5">
      {/* Answer Body */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary uppercase tracking-wider">
            <Sparkles className="size-3 text-primary" />
            <span>Role-Calibrated Answer</span>
          </span>
          {turn.roleAtTurn && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {turn.roleAtTurn}
            </Badge>
          )}
        </div>
        <p className="text-sm sm:text-base font-semibold leading-relaxed text-foreground whitespace-pre-line">
          {response.answer}
        </p>
      </div>

      {response.reasoning ? (
        <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground border border-border/50">
          <span className="font-semibold text-foreground">Operational context: </span>
          {response.reasoning}
        </div>
      ) : null}

      {/* Supporting CRM records list */}
      {shown > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-xs">
          <div className="bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 flex items-center justify-between">
            <span>Relevant CRM Records ({response.totalRecords})</span>
            <span className="text-[10px] text-muted-foreground/80">Filtered by your permissions</span>
          </div>
          <ul className="divide-y divide-border/50">
            {response.supportingRecords.map((record, index) => {
              const safeRecordUrl = sanitizeSafePath(record.url)
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs sm:text-sm font-medium text-foreground">{record.title}</span>
                    {record.detail ? <span className="block truncate text-[11px] text-muted-foreground">{record.detail}</span> : null}
                  </span>
                  {safeRecordUrl ? <ArrowRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" /> : null}
                </>
              )
              return (
                <li key={record.id ?? index}>
                  {safeRecordUrl ? (
                    <Link
                      to={safeRecordUrl}
                      className="group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3.5 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
          {response.totalRecords > shown ? (
            <p className="border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
              Showing {formatNumber(shown)} of {formatNumber(response.totalRecords)} records
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Recommended Role Action CTA Button */}
      {safeActionUrl ? (
        <div className="pt-1">
          <Button
            asChild
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/95 text-white shadow-soft transition-all active:scale-[0.98]"
          >
            <Link to={safeActionUrl}>
              <CheckCircle2 className="size-3.5" />
              <span>{response.recommendedAction ?? 'Perform Recommended Action'}</span>
              <ArrowRight className="size-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Ask PAWAN Copilot:
 * AI Assistant that performs actions and analyzes records strictly according to the user's role and permissions.
 */
export function AskPawanPage() {
  const { user } = useAuth()
  const suggestions = useQuery(askSuggestionsQuery)
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const nextId = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)
  const busy = turns.some((turn) => turn.state === 'pending')

  // Identify user's intrinsic primary role
  const detectedRoleKey = useMemo(() => {
    const roles = user?.roles ?? []
    if (roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR'].includes(r))) return 'EXECUTIVE'
    if (roles.some((r) => ['SALES_MANAGER', 'SALES_EXECUTIVE'].includes(r))) return 'SALES'
    if (roles.some((r) => ['FINANCE'].includes(r))) return 'FINANCE'
    if (roles.some((r) => ['PROJECT_MANAGER', 'DESIGNER'].includes(r))) return 'PROJECTS'
    if (roles.some((r) => ['TECHNICIAN'].includes(r))) return 'OPERATIONS'
    if (roles.some((r) => ['SUPPORT_AGENT'].includes(r))) return 'SUPPORT'
    if (roles.some((r) => ['HR'].includes(r))) return 'HR'
    return 'EXECUTIVE'
  }, [user])

  // Allow Directors/Admins to switch role perspectives
  const isSuperManager = useMemo(() => {
    return user?.roles.some((r) => ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR'].includes(r)) ?? false
  }, [user])

  const [activeRoleKey, setActiveRoleKey] = useState<string>(detectedRoleKey)

  // Sync if detected role loads
  useEffect(() => {
    if (detectedRoleKey) setActiveRoleKey(detectedRoleKey)
  }, [detectedRoleKey])

  const activePreset = ROLE_PRESETS[activeRoleKey] || ROLE_PRESETS.EXECUTIVE

  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  async function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || busy) return
    const id = nextId.current++
    setText('')
    setTurns((prev) => [...prev, { id, question: trimmed, state: 'pending', roleAtTurn: activePreset.shortTitle }])
    try {
      const response = await ask(trimmed)
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, state: 'answered', response } : turn)))
    } catch (error) {
      const message = error instanceof ApiError ? error.message : undefined
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, state: 'failed', error: message } : turn)))
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void send(text)
  }

  const PresetIcon = activePreset.icon

  return (
    <div className="grid gap-5 max-w-7xl mx-auto px-1 sm:px-2">
      {/* Role-Aware Assistant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <PageHeader
            title="Ask PAWAN — AI Business Copilot"
            description="Role-aware intelligence that analyzes records, enforces department boundaries, and initiates CRM actions."
          />
        </div>

        {/* Current Active Role Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs', activePreset.colorClass)}>
            <PresetIcon className="size-4" />
            <span>Active Role: {activePreset.label}</span>
          </div>
        </div>
      </div>

      {/* Role Perspective Switcher for Directors / Admins */}
      {isSuperManager && (
        <Card className="p-2 sm:p-2.5 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1.5">
              Director Lens:
            </span>
            <div className="flex flex-wrap gap-1">
              {Object.values(ROLE_PRESETS).map((preset) => {
                const Icon = preset.icon
                const isSelected = activeRoleKey === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setActiveRoleKey(preset.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      isSelected
                        ? cn(preset.badgeClass, 'shadow-xs font-semibold scale-[1.02]')
                        : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{preset.shortTitle}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: Left Conversation, Right Role Actions & Suggestions */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Chat Stream Section */}
        <section aria-label="Conversation" className="grid gap-4">
          {turns.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PresetIcon className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Hello {user?.fullName?.split(' ')[0] ?? 'there'}, how can I assist your {activePreset.shortTitle} today?
                  </h2>
                  <p className="text-xs text-muted-foreground">{activePreset.description}</p>
                </div>
              </div>

              {/* Role Action Launchpad */}
              <div className="mt-5 space-y-2.5">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Recommended Actions for {activePreset.label}:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePreset.actions.map((act) => {
                    const ActIcon = act.icon
                    return (
                      <button
                        key={act.label}
                        type="button"
                        onClick={() => void send(act.prompt)}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/70 hover:border-primary/50 bg-background/60 hover:bg-primary/5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
                      >
                        <span className="p-1 rounded-md bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                          <ActIcon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {act.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            &quot;{act.prompt}&quot;
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Focus tags */}
              <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1">Your Focus:</span>
                {activePreset.focusAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-[10px] font-normal">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <ol className="grid gap-5">
              {turns.map((turn) => (
                <li key={turn.id} className="grid gap-2">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-xs">
                      {turn.question}
                    </p>
                  </div>
                  <Card className="max-w-full p-4 border border-border/80 shadow-soft">
                    <Answer turn={turn} />
                  </Card>
                </li>
              ))}
            </ol>
          )}
          <div ref={endRef} />

          {/* Sticky Input Bar */}
          <form
            onSubmit={submit}
            className="sticky bottom-4 flex items-center gap-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-2 shadow-pop transition-all focus-within:ring-2 focus-within:ring-primary/30"
          >
            <label htmlFor="ask-question" className="sr-only">
              Your question
            </label>
            <Input
              id="ask-question"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={`Ask as ${activePreset.shortTitle}, e.g. "${activePreset.actions[0]?.prompt || 'Which invoices are overdue?'}"`}
              disabled={busy}
              autoComplete="off"
              className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm h-9"
            />
            <Button
              type="submit"
              loading={busy}
              disabled={!text.trim()}
              className="gap-1.5 rounded-xl font-semibold px-4 shadow-xs"
            >
              <Send className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ask</span>
            </Button>
          </form>
        </section>

        {/* Right Sidebar: Role Capabilities & Quick Prompts */}
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* Quick Role Actions */}
          <Card className="p-0 border border-border/80 shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/30 py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                <span>{activePreset.shortTitle} Actions</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Instant triggers calibrated for your permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {activePreset.actions.map((act) => {
                const ActIcon = act.icon
                return (
                  <div
                    key={act.label}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-accent/60 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => void send(act.prompt)}
                      disabled={busy}
                      className="flex items-center gap-2.5 text-left text-xs font-medium text-foreground group-hover:text-primary transition-colors flex-1 cursor-pointer disabled:opacity-50"
                    >
                      <ActIcon className="size-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      <span className="truncate">{act.label}</span>
                    </button>
                    {act.actionUrl && (
                      <Link
                        to={act.actionUrl}
                        className="text-[10px] text-muted-foreground hover:text-primary font-semibold px-1.5 py-0.5 rounded-md hover:bg-primary/10 transition-colors shrink-0"
                        title={act.actionName}
                      >
                        Go ➔
                      </Link>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Database Grounded Queries */}
          <Card className="p-0 border border-border/80 shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/30 py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Authorized Live Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {suggestions.isPending ? (
                <div className="grid gap-2 p-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (suggestions.data ?? []).length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">No custom database queries for this profile.</p>
              ) : (
                <ul className="grid gap-1">
                  {(suggestions.data ?? []).map((suggestion) => (
                    <li key={suggestion.tool}>
                      <button
                        type="button"
                        onClick={() => void send(suggestion.question)}
                        disabled={busy}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-md transition-colors cursor-pointer truncate disabled:opacity-50"
                      >
                        • {suggestion.question}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
