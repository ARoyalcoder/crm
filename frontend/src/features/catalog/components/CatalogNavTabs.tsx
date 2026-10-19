import { NavLink } from 'react-router-dom'
import { Briefcase, FolderTree, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/admin/services', label: 'Services', icon: Briefcase, countKey: 'services' },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, countKey: 'categories' },
  { to: '/admin/verticals', label: 'Verticals', icon: Layers, countKey: 'verticals' },
] as const

export function CatalogNavTabs({
  counts,
}: {
  counts?: { services?: number | string; categories?: number | string; verticals?: number | string }
}) {
  return (
    <div className="flex border-b border-border/80 bg-muted/20 px-1 pt-1">
      <nav className="flex space-x-2" aria-label="Catalog Sections">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const count = counts?.[tab.countKey]
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )
              }
            >
              <Icon className="size-3.5 transition-transform group-hover:scale-110" />
              <span>{tab.label}</span>
              {count !== undefined && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
