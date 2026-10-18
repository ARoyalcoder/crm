import { useMemo, useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Tooltip } from '@/components/ui/tooltip'
import { canSee, isActivePath, navigation, type NavSection } from '@/config/navigation'
import { useAuth } from '@/features/auth/auth-context'
import { prefetchRoute } from '@/lib/prefetch'
import { cn } from '@/lib/utils'

const OPEN_KEY = 'pp-nav-open-groups'

/** What the person chose for each group (true open, false closed). A group they never touched follows the default below. */
type GroupChoices = Record<string, boolean>

function readChoices(): GroupChoices {
  try {
    const raw = localStorage.getItem(OPEN_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    // An earlier version stored the list of open groups.
    if (Array.isArray(parsed)) return Object.fromEntries(parsed.filter((v): v is string => typeof v === 'string').map((id) => [id, true]))
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'))
    }
    return {}
  } catch {
    return {}
  }
}

/** Someone who can see only a few groups (a technician) sees them all open; with many, only the first two and the one they are in. */
const OPEN_ALL_UP_TO = 6
const OPEN_FIRST = 2

/** Sections filtered to what the signed-in user's permissions allow; empty sections are dropped. */
function useVisibleSections(): NavSection[] {
  const { user } = useAuth()
  return useMemo(
    () =>
      navigation
        .map((section) => ({ ...section, items: section.items.filter((item) => canSee(item, user?.permissions ?? [])) }))
        .filter((section) => section.items.length > 0),
    [user],
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Pawan Putra Business OS, home"
      className="flex h-11 shrink-0 items-center gap-2 px-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 group"
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2B66FE] via-[#3872FF] to-[#1E40AF] text-xs font-bold text-white shadow-[0_3px_10px_rgba(43,102,254,0.3)] group-hover:scale-105 transition-transform"
      >
        <Sparkles className="size-3.5 xl:size-4 text-white" />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="flex items-center gap-1.5 text-[13.5px] xl:text-[14px] font-bold tracking-tight text-foreground">
            <span>Pawan Putra</span>
            <span className="size-1.5 rounded-full bg-[#2B66FE] animate-pulse" />
          </span>
          <span className="block text-[10px] xl:text-[10.5px] font-medium text-muted-foreground">Multi-Service OS</span>
        </span>
      )}
    </Link>
  )
}

const itemClass = (active: boolean, collapsed?: boolean) =>
  cn(
    'flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs xl:text-[12.5px] font-medium transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    active
      ? 'bg-gradient-to-r from-[#2B66FE] via-[#3872FF] to-[#1E50E2] text-white font-semibold shadow-[0_3px_10px_rgba(43,102,254,0.3)]'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60',
    collapsed && 'justify-center px-0 py-1.5',
  )

type SidebarNavProps = {
  /** Icon-only rail (desktop, collapsed). */
  collapsed?: boolean
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const sections = useVisibleSections()
  const { pathname } = useLocation()
  const [choices, setChoices] = useState<GroupChoices>(readChoices)
  const titled = sections.filter((section) => section.title)

  function setGroup(id: string, open: boolean) {
    setChoices((prev) => {
      const next = { ...prev, [id]: open }
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next))
      } catch {
        // Not remembered; the group still toggles for this session.
      }
      return next
    })
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-2 pb-4">
      {sections.map((section, sectionIndex) => {
        const containsActive = section.items.some((item) => isActivePath(item, pathname))
        const collapsible = Boolean(section.title) && !collapsed
        const byDefault = containsActive || titled.length <= OPEN_ALL_UP_TO || titled.indexOf(section) < OPEN_FIRST
        const open = !collapsible || (choices[section.id] ?? byDefault)
        const listId = `nav-group-${section.id}`

        return (
          <div key={section.id} className={cn('flex flex-col gap-0.5', sectionIndex > 0 && 'mt-1')}>
            {collapsed && sectionIndex > 0 ? <div aria-hidden="true" className="mx-3 my-1.5 h-px bg-border" /> : null}
            {collapsible ? (
              <button
                type="button"
                onClick={() => setGroup(section.id, !open)}
                aria-expanded={open}
                aria-controls={listId}
                className="flex w-full items-center justify-between rounded-lg px-2 py-0.5 text-[9.5px] xl:text-[10px] font-semibold tracking-wider text-muted-foreground uppercase outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                {section.title}
                <ChevronDown className={cn('size-3 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
              </button>
            ) : null}
            <ul id={listId} className={cn('flex flex-col gap-0.5', !open && 'hidden')}>
              {section.items.map((item) => {
                const active = isActivePath(item, pathname)
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    onPointerEnter={() => prefetchRoute(item.to)}
                    onFocus={() => prefetchRoute(item.to)}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={itemClass(active, collapsed)}
                  >
                    <item.icon className="size-3.5 xl:size-4 shrink-0" aria-hidden="true" />
                    {collapsed ? null : <span className="truncate">{item.label}</span>}
                  </NavLink>
                )
                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip label={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export function AskPawanPromo({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <Tooltip label="Ask PAWAN AI Assistant" side="right">
        <Link
          to="/ask"
          onClick={onNavigate}
          aria-label="Ask PAWAN AI Assistant"
          className="flex size-8 xl:size-8.5 items-center justify-center rounded-xl bg-gradient-to-br from-[#8075ff] to-[#5e56e8] text-white shadow-md shadow-[#5e56e8]/25 hover:scale-105 active:scale-95 transition-all"
        >
          <Sparkles className="size-4 text-white" />
        </Link>
      </Tooltip>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#8075ff] to-[#5e56e8] p-2.5 xl:p-3 text-white shadow-md shadow-[#5e56e8]/25">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="flex size-4.5 xl:size-5 items-center justify-center rounded-md bg-white/20 backdrop-blur-sm">
          <Sparkles className="size-2.5 xl:size-3 text-white" />
        </span>
        <p className="text-[9.5px] xl:text-[10px] font-bold uppercase tracking-wider text-white/90">Ask PAWAN</p>
      </div>
      <p className="text-[11.5px] xl:text-xs font-semibold leading-tight">Need smart assistance?</p>
      <p className="mt-0.5 text-[10px] xl:text-[10.5px] text-white/80 leading-snug line-clamp-2">
        Instant AI insights & queries.
      </p>
      <Link
        to="/ask"
        onClick={onNavigate}
        className="mt-1.5 xl:mt-2 inline-flex items-center justify-center rounded-lg bg-white px-2.5 py-0.5 text-[10px] xl:text-[11px] font-semibold text-[#5e56e8] shadow-xs hover:bg-white/95 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        Ask AI ✦
      </Link>
    </div>
  )
}

/** Desktop side rail. Scrolls on its own; `collapsed` shrinks it to icons. */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      data-print-hide
      className={cn(
        'sticky top-2 m-2 mr-0 hidden h-[calc(100svh-16px)] shrink-0 flex-col rounded-[16px] xl:rounded-[18px] border border-border/80 bg-card shadow-soft transition-[width] duration-200 md:flex overflow-hidden self-start z-30',
        collapsed ? 'w-[54px]' : 'w-[192px] xl:w-[204px]',
      )}
    >
      <Brand compact={collapsed} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 pb-2">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Sticky Bottom AI Assistant Card / Icon */}
      <div
        className={cn(
          'shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-md transition-all',
          collapsed ? 'p-1.5 pt-1.5 pb-2 flex justify-center' : 'p-2 xl:p-2.5 pt-1.5',
        )}
      >
        <AskPawanPromo compact={collapsed} />
      </div>
    </aside>
  )
}

export { Brand }
