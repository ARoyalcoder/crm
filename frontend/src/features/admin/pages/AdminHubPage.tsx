import { Link } from 'react-router-dom'
import {
  Banknote,
  Building2,
  CreditCard,
  FolderTree,
  Layers,
  ListChecks,
  Plug,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Trophy,
  Users,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { toneChip } from '@/components/shared/tones'
import { useAuth } from '@/features/auth/auth-context'

type AdminItem = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  /** The permission the page behind it needs. People without it do not see the card. */
  permission: string
}

type AdminSection = { title: string; items: AdminItem[] }

const SECTIONS: AdminSection[] = [
  {
    title: 'People and access',
    items: [
      { title: 'Users', description: 'Accounts and who can sign in', href: '/admin/users', icon: Users, permission: 'USER_VIEW' },
      { title: 'Roles and permissions', description: 'What each role is allowed to do', href: '/admin/roles', icon: Shield, permission: 'ROLE_VIEW' },
      { title: 'Branches', description: 'Offices and the people in them', href: '/admin/branches', icon: Building2, permission: 'BRANCH_VIEW' },
    ],
  },
  {
    title: 'What you sell',
    items: [
      { title: 'Verticals', description: 'The lines of business', href: '/admin/verticals', icon: Layers, permission: 'CATALOG_VIEW' },
      { title: 'Services', description: 'The service catalog and its prices', href: '/admin/services', icon: Wrench, permission: 'CATALOG_VIEW' },
      { title: 'Categories', description: 'How services are grouped', href: '/admin/categories', icon: FolderTree, permission: 'CATALOG_VIEW' },
    ],
  },
  {
    title: 'How sales and delivery run',
    items: [
      { title: 'Lead questions', description: 'What to ask to qualify a lead', href: '/admin/qualification-questions', icon: ListChecks, permission: 'LEAD_CONFIGURE' },
      { title: 'Project templates', description: 'Reusable plans for new projects', href: '/admin/project-templates', icon: Workflow, permission: 'PROJECT_VIEW' },
      { title: 'Payment methods', description: 'The ways customers can pay', href: '/admin/payment-methods', icon: CreditCard, permission: 'FINANCE_VIEW' },
    ],
  },
  {
    title: 'Automation and rules',
    items: [
      { title: 'Workflow rules', description: 'Actions that run on their own', href: '/admin/workflow-rules', icon: Zap, permission: 'WORKFLOW_VIEW' },
      { title: 'Support SLAs', description: 'How fast tickets must be answered', href: '/admin/sla', icon: SlidersHorizontal, permission: 'TICKET_MANAGE' },
      { title: 'Achievement rules', description: 'How reward points are earned', href: '/rewards/achievement-rules', icon: Trophy, permission: 'REWARDS_VIEW' },
      { title: 'Commission rules', description: 'How sales commission is worked out', href: '/performance/commission-rules', icon: Banknote, permission: 'COMMISSION_VIEW' },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Integrations', description: 'Email, storage and other connected services', href: '/admin/integrations', icon: Plug, permission: 'INTEGRATION_VIEW' },
      { title: 'Audit log', description: 'Who changed what, and when', href: '/admin/audit', icon: ScrollText, permission: 'AUDIT_VIEW' },
    ],
  },
]

/** The settings the business is configured with, grouped by what they are for. Each person sees only what they may open. */
export function AdminHubPage() {
  const { user } = useAuth()
  const allowed = new Set(user?.permissions ?? [])
  const sections = SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => allowed.has(item.permission)) })).filter(
    (section) => section.items.length > 0,
  )

  return (
    <div className="grid gap-8">
      <PageHeader title="Administration" description="People and access, the catalog, how work runs, and connected systems." />

      {sections.length === 0 ? (
        <EmptyState icon={Shield} title="Nothing to administer" description="Your role has no settings. Ask an administrator for changes." />
      ) : (
        sections.map((section) => (
          <section key={section.title} aria-labelledby={`admin-${section.title}`} className="grid gap-3">
            <h2 id={`admin-${section.title}`} className="text-base font-semibold tracking-tight">
              {section.title}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map(({ title, description, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="group flex h-full items-start gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneChip.primary}`}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="text-sm text-muted-foreground">{description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
