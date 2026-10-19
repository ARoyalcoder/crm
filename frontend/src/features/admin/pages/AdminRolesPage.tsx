import { useMemo, useState } from 'react'
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  FileSpreadsheet,
  Headphones,
  Lock,
  Palette,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-context'
import { humanize } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface RoleDefinition {
  code: string
  name: string
  category: 'Executive & Admin' | 'Sales & Commercial' | 'Operations & Service' | 'Corporate' | 'External'
  icon: typeof Shield
  level: string
  color: string
  summary: string
  keyResponsibilities: string[]
  primaryAreas: string[]
  samplePermissions: string[]
}

export const SYSTEM_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    category: 'Executive & Admin',
    icon: Crown,
    level: 'System / Enterprise',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300',
    summary: 'Supreme platform control with unrestricted read/write across all modules, configuration, and security settings.',
    keyResponsibilities: [
      'Master administrative control over all organizations, branches, and database partitions.',
      'Manage system security, API keys, credentials, and third-party integrations.',
      'Assign, grant, and revoke administrator roles, user accounts, and system-wide privileges.',
      'Access unrestricted financial, operational, and performance analytics across the entire enterprise.',
      'Perform disaster recovery, compliance audits, and data retention governance.',
    ],
    primaryAreas: ['Security', 'Identity', 'Platform Settings', 'All Business Modules', 'Audit Logs'],
    samplePermissions: [
      'USER_VIEW',
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'ROLE_VIEW',
      'ROLE_UPDATE',
      'ORGANIZATION_UPDATE',
      'AUDIT_VIEW',
      'FINANCE_APPROVE',
    ],
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    category: 'Executive & Admin',
    icon: ShieldCheck,
    level: 'Management',
    color: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    summary: 'Oversees day-to-day business operations, user management, branch setup, and product/service catalogs.',
    keyResponsibilities: [
      'Provision, update, and manage employee accounts and branch assignments.',
      'Configure product catalogs, price books, service verticals, and dynamic form fields.',
      'Maintain operational branches, departments, and SLA configurations.',
      'Supervise workflow automation rules and trigger actions.',
      'Monitor audit logs and system activity across all operational departments.',
    ],
    primaryAreas: ['Users', 'Branches', 'Catalog', 'Projects', 'Finance (View)', 'Workflows'],
    samplePermissions: [
      'USER_VIEW',
      'USER_CREATE',
      'USER_UPDATE',
      'BRANCH_VIEW',
      'BRANCH_UPDATE',
      'CATALOG_CREATE',
      'CATALOG_UPDATE',
      'PROJECT_VIEW',
      'AUDIT_VIEW',
    ],
  },
  {
    code: 'DIRECTOR',
    name: 'Director / Executive',
    category: 'Executive & Admin',
    icon: Sparkles,
    level: 'Executive',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    summary: 'Executive leadership with 360° strategic visibility, high-level reporting, and final financial sign-offs.',
    keyResponsibilities: [
      'Review executive health metrics: revenue pipeline, receivables, and profit margins.',
      'Approve high-value invoices, write-offs, credit notes, and sensitive financial adjustments.',
      'Track multi-vertical project delivery, milestone progress, and client satisfaction.',
      'Oversee organizational expansion, branch operations, and overall company throughput.',
    ],
    primaryAreas: ['Executive KPIs', 'Finance Approval', 'All Projects', 'Organization Reports'],
    samplePermissions: [
      'FINANCE_VIEW',
      'FINANCE_APPROVE',
      'PROJECT_VIEW',
      'CUSTOMER_VIEW',
      'ORGANIZATION_VIEW',
      'ROLE_VIEW',
      'ANALYTICS_VIEW',
    ],
  },
  {
    code: 'SALES_MANAGER',
    name: 'Sales Manager',
    category: 'Sales & Commercial',
    icon: TrendingUp,
    level: 'Department Head',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    summary: 'Leads commercial strategy, quota achievement, pipeline velocity, and customer accounts.',
    keyResponsibilities: [
      'Manage sales quotas, commission rules, and executive lead allocations.',
      'Review and approve quotations, discount margins, and commercial agreements.',
      'Own customer relationship records, conversion stages, and opportunity funnels.',
      'Analyze sales forecasts, win/loss rates, and sales rep performance benchmarks.',
    ],
    primaryAreas: ['Leads', 'Opportunities', 'Quotations', 'Customers', 'Commissions'],
    samplePermissions: [
      'LEAD_VIEW',
      'LEAD_CREATE',
      'LEAD_UPDATE',
      'OPPORTUNITY_VIEW',
      'QUOTATION_VIEW',
      'CUSTOMER_VIEW',
      'COMMISSION_VIEW',
    ],
  },
  {
    code: 'SALES_EXECUTIVE',
    name: 'Sales Executive',
    category: 'Sales & Commercial',
    icon: UserCheck,
    level: 'Field / Operational',
    color: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    summary: 'Direct client acquisition, qualification calls, proposal generation, and relationship cultivation.',
    keyResponsibilities: [
      'Engage leads, run customer qualification questionnaires, and record discovery notes.',
      'Build quotations, apply standard catalog pricing, and follow up with decision-makers.',
      'Track deal pipeline status from discovery through negotiation and closing.',
      'Record customer interactions, site inspection requests, and contact touchpoints.',
    ],
    primaryAreas: ['Leads', 'Quotations', 'Customer Contacts', 'Activities'],
    samplePermissions: [
      'LEAD_VIEW',
      'LEAD_CREATE',
      'LEAD_UPDATE',
      'QUOTATION_VIEW',
      'CUSTOMER_VIEW',
      'ACTIVITY_VIEW',
    ],
  },
  {
    code: 'PROJECT_MANAGER',
    name: 'Project Manager',
    category: 'Operations & Service',
    icon: Briefcase,
    level: 'Project Leadership',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    summary: 'End-to-end project execution, milestone scheduling, task delegation, and delivery quality.',
    keyResponsibilities: [
      'Plan project phases, milestones, deliverables, and critical paths.',
      'Assign project tasks to Designers, Technicians, and field teams.',
      'Monitor on-site deliverables, snag lists, customer sign-offs, and project budgets.',
      'Coordinate with clients to ensure timeline compliance and deliverable approval.',
    ],
    primaryAreas: ['Projects', 'Milestones', 'Tasks', 'Deliverables', 'Field Jobs'],
    samplePermissions: [
      'PROJECT_VIEW',
      'PROJECT_UPDATE',
      'PROJECT_CONFIGURE',
      'CUSTOMER_VIEW',
      'FIELD_JOB_VIEW',
      'CATALOG_VIEW',
    ],
  },
  {
    code: 'DESIGNER',
    name: 'Designer / Architect',
    category: 'Operations & Service',
    icon: Palette,
    level: 'Creative & Technical',
    color: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
    summary: 'Creates design drawings, technical blueprints, 3D renderings, and material specifications.',
    keyResponsibilities: [
      'Review project design briefs, site measurements, and engineering constraints.',
      'Produce shop drawings, revisions, layout schematics, and 3D visualisations.',
      'Upload and version design deliverables for customer and project manager review.',
      'Ensure design specifications match selected service catalog offerings and site conditions.',
    ],
    primaryAreas: ['Project Deliverables', 'Design Tasks', 'Drawings & Files'],
    samplePermissions: ['PROJECT_VIEW', 'DOCUMENT_VIEW', 'CATALOG_VIEW'],
  },
  {
    code: 'TECHNICIAN',
    name: 'Field Technician',
    category: 'Operations & Service',
    icon: Wrench,
    level: 'On-Site Technical',
    color: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    summary: 'Conducts physical installation, equipment maintenance, site inspections, and repair services.',
    keyResponsibilities: [
      'Execute assigned field jobs, scheduled maintenance visits, and emergency callouts.',
      'Record on-site proof of work (photos, checklists, geo-coordinates, and client signatures).',
      'Report equipment defects, warranty claims, and spare-part requirements.',
      'Complete safety protocol validations and mark job milestones as complete.',
    ],
    primaryAreas: ['Field Jobs', 'Proof of Work', 'Service Visits', 'AMC Contracts'],
    samplePermissions: ['FIELD_JOB_WORK', 'FIELD_JOB_VIEW', 'PROJECT_VIEW', 'AMC_VIEW'],
  },
  {
    code: 'FINANCE',
    name: 'Finance & Accounts',
    category: 'Corporate',
    icon: FileSpreadsheet,
    level: 'Commercial & Legal',
    color: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
    summary: 'Manages billing, invoicing, payments, receivables ageing, and ledger reconciliations.',
    keyResponsibilities: [
      'Generate, issue, and distribute tax-compliant GST invoices to customers.',
      'Record and allocate incoming client payments across outstanding invoices.',
      'Track aging accounts, issue collection tasks, credit notes, and debit notes.',
      'Coordinate with bank portals, payment gateways, and accounting reconciliation.',
    ],
    primaryAreas: ['Invoices', 'Payments', 'Receivables', 'Credit/Debit Notes', 'Ageing'],
    samplePermissions: [
      'FINANCE_VIEW',
      'FINANCE_MANAGE',
      'FINANCE_APPROVE',
      'RECEIVABLES_VIEW',
      'CUSTOMER_VIEW',
    ],
  },
  {
    code: 'HR',
    name: 'Human Resources',
    category: 'Corporate',
    icon: Users,
    level: 'People & Operations',
    color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    summary: 'Oversees employee profiles, attendance logs, shift scheduling, and recruitment pipelines.',
    keyResponsibilities: [
      'Maintain complete employee digital records, department rosters, and emergency details.',
      'Track daily attendance logs, overtime, leaves, and biometric punch status.',
      'Manage recruitment: job openings, applicant stages, interviews, and offer letters.',
      'Support performance reviews, rewards, and compliance onboarding.',
    ],
    primaryAreas: ['Employees', 'Attendance', 'Recruitment', 'Job Openings', 'Rewards'],
    samplePermissions: [
      'WORKFORCE_VIEW',
      'WORKFORCE_CREATE',
      'WORKFORCE_UPDATE',
      'USER_VIEW',
      'RECRUITMENT_MANAGE',
    ],
  },
  {
    code: 'SUPPORT_AGENT',
    name: 'Customer Support',
    category: 'Corporate',
    icon: Headphones,
    level: 'Customer Care',
    color: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    summary: 'Resolves client inquiries, manages support tickets, and enforces SLA response targets.',
    keyResponsibilities: [
      'Answer customer support inquiries, log tickets, and assign priority ratings.',
      'Diagnose customer issues and escalate unresolved items to technicians or project managers.',
      'Monitor SLA breach timers and ensure adherence to contract response standards.',
      'Record customer feedback and confirm customer satisfaction upon ticket closure.',
    ],
    primaryAreas: ['Support Tickets', 'SLA Tracking', 'Customer History', 'Knowledge Base'],
    samplePermissions: ['TICKET_VIEW', 'TICKET_CREATE', 'TICKET_MANAGE', 'CUSTOMER_VIEW'],
  },
]

function groupByArea(permissions: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const permission of [...permissions].sort()) {
    const area = permission.split('_')[0] ?? permission
    groups.set(area, [...(groups.get(area) ?? []), permission])
  }
  return [...groups.entries()]
}

export function AdminRolesPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  const userRoles = user?.roles ?? []
  const myPermissionGroups = useMemo(() => groupByArea(user?.permissions ?? []), [user?.permissions])

  // If Super Admin: show all system roles. If regular user: show only roles assigned to current user.
  const visibleRoles = useMemo(() => {
    return SYSTEM_ROLE_DEFINITIONS.filter((roleDef) => {
      if (!isSuperAdmin) {
        return userRoles.includes(roleDef.code)
      }
      const matchesSearch =
        search.trim() === '' ||
        roleDef.name.toLowerCase().includes(search.toLowerCase()) ||
        roleDef.code.toLowerCase().includes(search.toLowerCase()) ||
        roleDef.summary.toLowerCase().includes(search.toLowerCase()) ||
        roleDef.primaryAreas.some((a) => a.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = selectedCategory === 'ALL' || roleDef.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [isSuperAdmin, userRoles, search, selectedCategory])

  const categories = ['ALL', 'Executive & Admin', 'Sales & Commercial', 'Operations & Service', 'Corporate']

  return (
    <div className="grid gap-6 pb-12">
      <PageHeader
        title={isSuperAdmin ? 'Role Matrix & Organizational Responsibilities' : 'My Role & Responsibilities'}
        description={
          isSuperAdmin
            ? 'Enterprise directory of organizational roles, operational responsibilities, and system access rights.'
            : 'Clear breakdown of your organizational role, operational duties, and assigned access privileges.'
        }
        back={{ to: '/admin', label: 'Administration' }}
      />

      {/* Hero Banner with User's Active Context */}
      <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary shadow-xs">
              <Shield className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foreground">{user?.fullName}</span>
                {isSuperAdmin && (
                  <Badge variant="default" className="gap-1 bg-purple-600 text-white">
                    <Crown className="size-3" />
                    Super Admin
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Assigned Roles:</span>
                {userRoles.length > 0 ? (
                  userRoles.map((role) => (
                    <Badge key={role} variant="outline" className="font-mono text-[11px] font-semibold">
                      {humanize(role)}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="neutral">No direct role assigned</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-border/60 bg-background/60 p-3 text-right">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Access Privileges</span>
              <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                {user?.permissions.length ?? 0}
              </div>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <span className="text-[11px] font-medium text-muted-foreground uppercase">Scope</span>
              <div className="text-xs font-semibold text-primary">
                {isSuperAdmin ? 'Full Enterprise' : 'Designated Duties'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Super Admin Toolbar: Search & Filter */}
      {isSuperAdmin && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search roles, duties, or permissions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {cat === 'ALL' ? 'All Roles' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role Cards Grid */}
      <div className="grid gap-5">
        {visibleRoles.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <ShieldAlert className="mx-auto mb-2 size-8 opacity-40" />
            <p className="text-sm font-semibold">No roles found matching your criteria</p>
            <p className="text-xs">Try adjusting your search query or role filter.</p>
          </Card>
        ) : (
          visibleRoles.map((roleDef) => {
            const Icon = roleDef.icon
            const isMyRole = userRoles.includes(roleDef.code)
            const isExpanded = expandedRole === roleDef.code

            return (
              <Card
                key={roleDef.code}
                className={cn(
                  'border transition-all duration-200',
                  isMyRole
                    ? 'border-primary/50 shadow-md ring-1 ring-primary/20'
                    : 'border-border/80 hover:border-border hover:shadow-soft',
                )}
              >
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-xl border p-2.5', roleDef.color)}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold">{roleDef.name}</CardTitle>
                          <Badge variant="outline" className="font-mono text-[10px] font-normal">
                            {roleDef.code}
                          </Badge>
                          {isMyRole && (
                            <Badge variant="success" className="gap-1 text-[10px] font-semibold">
                              <CheckCircle2 className="size-3" />
                              Your Active Role
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-0.5 text-xs">{roleDef.summary}</CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant="secondary" className="text-[11px]">
                        {roleDef.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRole(isExpanded ? null : roleDef.code)}
                        className="h-8 gap-1 text-xs"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-5 pt-4">
                  {/* Primary Responsibilities Block */}
                  <div>
                    <h3 className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Core Responsibilities & Accountability
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {roleDef.keyResponsibilities.map((resp, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Primary Operational Areas */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Covered Areas:</span>
                    {roleDef.primaryAreas.map((area) => (
                      <Badge key={area} variant="neutral" className="text-[11px] font-normal">
                        {area}
                      </Badge>
                    ))}
                  </div>

                  {/* Expandable Technical Permissions Block */}
                  {isExpanded && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                          System Capabilities & Feature Grants
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {roleDef.code === 'SUPER_ADMIN' ? 'All System Rights Granted' : 'Standard Baseline Grants'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {roleDef.samplePermissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="font-mono text-[10px]">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* User's Exact Assigned Permissions Breakdown (Only for current user context) */}
      <Card className="border-border/80">
        <CardHeader className="border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            <CardTitle>Your Active System Permissions</CardTitle>
          </div>
          <CardDescription>
            Direct breakdown of all {user?.permissions.length ?? 0} active permission authorities granted to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {myPermissionGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No individual permissions detected on this profile.</p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myPermissionGroups.map(([area, perms]) => (
                <div key={area} className="rounded-xl border border-border/50 bg-card p-3 shadow-xs">
                  <dt className="text-xs font-bold tracking-wide text-foreground uppercase">{humanize(area)}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <Badge key={p} variant="neutral" className="font-mono text-[10px] font-normal">
                        {humanize(p.slice(area.length + 1) || p)}
                      </Badge>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
