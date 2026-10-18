import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { UserMenu } from '@/components/layout/UserMenu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar'
import { useCanSearch } from '@/features/search/permissions'

type HeaderProps = {
  collapsed?: boolean
  canToggle?: boolean
  onToggleCollapsed?: () => void
  onOpenMobileNav?: () => void
}

/**
 * The bar across the top of every page: navigation toggles, where you are, global search, theme,
 * notifications and the account menu. Sticky, so search and the bell are always one click away.
 */
export function Header({}: HeaderProps = {}) {
  const canSearch = useCanSearch()
  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-1.5 sm:gap-2 border-b border-border/40 bg-background/80 px-3 sm:px-4 md:px-4 xl:px-5 backdrop-blur-md md:gap-2.5"
    >
      <SidebarTrigger className="-ml-1 size-8 rounded-lg" />
      <div className="hidden min-w-0 xl:block">
        <Breadcrumbs />
      </div>
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 md:gap-2">
        {canSearch ? <GlobalSearchBar /> : null}
        <ThemeToggle />
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  )
}
