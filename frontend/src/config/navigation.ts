import {
  Banknote,
  BarChart3,
  Brain,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileSpreadsheet,
  FolderKanban,
  FolderOpen,
  Gauge,
  Gift,
  Handshake,
  Headphones,
  HardHat,
  HelpCircle,
  Hourglass,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  PlugZap,
  ReceiptText,
  ScrollText,
  Settings2,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Trophy,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  /** If set, the entry is only shown to users holding this permission (e.g. 'CUSTOMER_VIEW'). */
  permission?: string
  /** If set, the entry is shown to users holding at least one of these. */
  anyPermission?: string[]
  /** If set, the user needs every one of these as well (a dashboard needs ANALYTICS_VIEW and the permission of the module it reads). */
  requires?: string[]
  /** Other path prefixes that keep this entry highlighted (a section's sub-pages). */
  alsoActiveFor?: string[]
  /** Match this exact path only, so a parent route does not stay lit for its children. */
  end?: boolean
}

export type NavSection = {
  /** Stable id: remembered when the user collapses a group. */
  id: string
  /** Heading above the group; omitted for the first, untitled group. */
  title?: string
  icon?: LucideIcon
  items: NavItem[]
}

/**
 * Everything the sidebar offers, grouped the way the business thinks about its work. Every entry is a
 * real route (see app/router.tsx); an entry with a permission is hidden from users who lack it, and a
 * group with nothing visible is not shown. The API enforces the same rules on every request.
 */
export const navigation: NavSection[] = [
  {
    id: 'workspace',
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
      { label: 'My work', to: '/my-work', icon: ListTodo },
      { label: 'Daily brief', to: '/brief', icon: Sparkles, permission: 'BRIEF_VIEW' },
      { label: 'Ask Pawan', to: '/ask', icon: MessageSquareText, permission: 'ASK_VIEW' },
      { label: 'Pawan Pulse', to: '/pulse', icon: Gauge, permission: 'PULSE_VIEW', alsoActiveFor: ['/pulse'] },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: Users,
    items: [
      { label: 'Leads', to: '/leads', icon: Target, permission: 'LEAD_VIEW' },
      { label: 'Qualification', to: '/admin/qualification-questions', icon: HelpCircle, permission: 'LEAD_CONFIGURE' },
      { label: 'Customers', to: '/customers', icon: Users, permission: 'CUSTOMER_VIEW' },
      { label: 'Customer intelligence', to: '/intelligence', icon: Brain, permission: 'INTELLIGENCE_VIEW' },
      { label: 'Activities & follow-ups', to: '/activities', icon: CalendarCheck, permission: 'ACTIVITY_VIEW' },
    ],
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: TrendingUp,
    items: [
      { label: 'Pipeline', to: '/opportunities', icon: TrendingUp, permission: 'OPPORTUNITY_VIEW' },
      { label: 'Quotations', to: '/quotations', icon: FileSpreadsheet, permission: 'QUOTATION_VIEW' },
      { label: 'Orders', to: '/orders', icon: ShoppingBag, permission: 'ORDER_VIEW' },
    ],
  },
  {
    id: 'projects',
    title: 'Projects & field work',
    icon: FolderKanban,
    items: [
      { label: 'Projects', to: '/projects', icon: FolderKanban, permission: 'PROJECT_VIEW' },
      { label: 'Delivery analytics', to: '/project-analytics', icon: BarChart3, permission: 'PROJECT_VIEW' },
      { label: 'Field jobs', to: '/field-jobs', icon: Truck, anyPermission: ['FIELD_JOB_VIEW', 'FIELD_JOB_MANAGE'] },
      { label: 'My jobs', to: '/my-jobs', icon: HardHat, permission: 'FIELD_JOB_WORK' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: CircleDollarSign,
    items: [
      { label: 'Invoices', to: '/invoices', icon: ReceiptText, permission: 'FINANCE_VIEW' },
      { label: 'Payments', to: '/payments', icon: Banknote, permission: 'FINANCE_VIEW' },
      { label: 'Receivables', to: '/receivables', icon: Hourglass, permission: 'RECEIVABLES_VIEW', alsoActiveFor: ['/receivables'] },
      { label: 'Ageing report', to: '/finance/ageing', icon: ClipboardList, permission: 'FINANCE_VIEW' },
    ],
  },
  {
    id: 'service',
    title: 'Service',
    icon: Headphones,
    items: [
      { label: 'Support tickets', to: '/support/tickets', icon: Headphones, anyPermission: ['TICKET_VIEW', 'TICKET_CREATE', 'TICKET_MANAGE'] },
      { label: 'AMC contracts', to: '/amc-contracts', icon: FileCheck2, permission: 'AMC_VIEW', alsoActiveFor: ['/service-contracts'] },
      { label: 'Warranties', to: '/warranties', icon: Shield, permission: 'WARRANTY_VIEW' },
    ],
  },
  {
    id: 'workforce',
    title: 'Workforce',
    icon: UsersRound,
    items: [
      { label: 'Employees', to: '/workforce/employees', icon: UsersRound, permission: 'WORKFORCE_VIEW' },
      { label: 'Attendance', to: '/workforce/attendance', icon: CalendarDays, permission: 'WORKFORCE_CREATE' },
      { label: 'My profile', to: '/workforce/my-profile', icon: UserCheck, permission: 'WORKFORCE_VIEW' },
      { label: 'Performance', to: '/performance/dashboard', icon: Gauge, permission: 'PERFORMANCE_VIEW', alsoActiveFor: ['/performance/team'] },
      { label: 'Commissions', to: '/performance/commissions', icon: Banknote, permission: 'COMMISSION_VIEW', alsoActiveFor: ['/performance/commission-rules'] },
    ],
  },
  {
    id: 'recruitment',
    title: 'Recruitment',
    icon: Briefcase,
    items: [
      { label: 'Job openings', to: '/recruitment/jobs', icon: Briefcase, permission: 'RECRUITMENT_VIEW' },
      { label: 'Candidates', to: '/recruitment/candidates', icon: UserPlus, permission: 'RECRUITMENT_VIEW' },
    ],
  },
  {
    id: 'rewards',
    title: 'Pawan Rewards',
    icon: Trophy,
    items: [
      { label: 'Leaderboard', to: '/rewards/leaderboard', icon: Trophy, permission: 'REWARDS_VIEW' },
      { label: 'Customer rewards', to: '/rewards/customer', icon: Gift, permission: 'REWARDS_VIEW' },
      { label: 'Achievement rules', to: '/rewards/achievement-rules', icon: ScrollText, permission: 'REWARDS_VIEW' },
    ],
  },
  {
    id: 'partners',
    title: 'Vendors & partners',
    icon: Handshake,
    items: [
      { label: 'Vendors', to: '/vendors', icon: Store, permission: 'VENDOR_VIEW' },
      { label: 'Partners', to: '/partners', icon: Handshake, permission: 'PARTNER_VIEW' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: FolderOpen,
    items: [
      { label: 'All documents', to: '/documents', icon: FolderOpen, permission: 'DOCUMENT_VIEW', end: true },
      { label: 'My documents', to: '/documents/mine', icon: FileSpreadsheet, permission: 'DOCUMENT_VIEW' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { label: 'Sales', to: '/analytics/sales', icon: TrendingUp, requires: ['ANALYTICS_VIEW'], anyPermission: ['LEAD_VIEW', 'OPPORTUNITY_VIEW'] },
      { label: 'Projects', to: '/analytics/projects', icon: FolderKanban, requires: ['ANALYTICS_VIEW'], permission: 'PROJECT_VIEW' },
      { label: 'Finance', to: '/analytics/finance', icon: Banknote, requires: ['ANALYTICS_VIEW'], permission: 'FINANCE_VIEW' },
      { label: 'Service', to: '/analytics/service', icon: Headphones, requires: ['ANALYTICS_VIEW'], anyPermission: ['TICKET_VIEW', 'AMC_VIEW'] },
      { label: 'Workforce', to: '/analytics/workforce', icon: UsersRound, requires: ['ANALYTICS_VIEW'], permission: 'WORKFORCE_VIEW' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: ShieldCheck,
    items: [
      { label: 'Admin hub', to: '/admin', icon: Settings2, end: true },
      { label: 'Users', to: '/admin/users', icon: Users, permission: 'USER_VIEW' },
      { label: 'Roles & permissions', to: '/admin/roles', icon: Shield, permission: 'ROLE_VIEW' },
      { label: 'Branches', to: '/admin/branches', icon: Building2, permission: 'BRANCH_VIEW' },
      { label: 'Services & catalog', to: '/admin/services', icon: Wrench, permission: 'CATALOG_VIEW', alsoActiveFor: ['/admin/categories', '/admin/verticals'] },
      { label: 'Automation', to: '/admin/workflow-rules', icon: ScrollText, permission: 'WORKFLOW_VIEW' },
      { label: 'Integrations', to: '/admin/integrations', icon: PlugZap, permission: 'INTEGRATION_VIEW' },
      { label: 'Audit log', to: '/admin/audit', icon: ScrollText, permission: 'AUDIT_VIEW' },
    ],
  },
]

/** Is this entry visible to someone who holds `permissions`? */
export function canSee(item: NavItem, permissions: readonly string[]): boolean {
  if (item.requires && !item.requires.every((p) => permissions.includes(p))) return false
  if (item.permission) return permissions.includes(item.permission)
  if (item.anyPermission) return item.anyPermission.some((p) => permissions.includes(p))
  return true
}

/** Does `pathname` belong to this entry (the page itself or one of its sub-pages)? */
export function isActivePath(item: NavItem, pathname: string): boolean {
  const matches = (prefix: string) => (prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/'))
  if (item.end) return pathname === item.to
  return matches(item.to) || (item.alsoActiveFor ?? []).some(matches)
}
