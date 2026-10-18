import * as React from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Sparkles } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { canSee, isActivePath, navigation } from "@/config/navigation"
import { useAuth } from "@/features/auth/auth-context"
import { prefetchRoute } from "@/lib/prefetch"
import { cn } from "@/lib/utils"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  const visibleSections = React.useMemo(
    () =>
      navigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canSee(item, user?.permissions ?? [])),
        }))
        .filter((section) => section.items.length > 0),
    [user],
  )

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-card/95 backdrop-blur-md" {...props}>
      <SidebarHeader className="border-b border-border/40 p-2">
        <Link
          to="/"
          onClick={handleNavigate}
          aria-label="Pawan Putra Business OS, home"
          className="flex h-10 items-center gap-2.5 rounded-lg px-2 outline-none transition-colors hover:bg-sidebar-accent group"
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2B66FE] via-[#3872FF] to-[#1E40AF] text-xs font-bold text-white shadow-[0_3px_10px_rgba(43,102,254,0.3)] group-hover:scale-105 transition-transform"
          >
            <Sparkles className="size-3.5 text-white" />
          </span>
          <div className="flex flex-col leading-tight overflow-hidden transition-all group-data-[collapsible=icon]:hidden">
            <span className="flex items-center gap-1.5 text-[13px] font-bold tracking-tight text-foreground">
              <span>Pawan Putra</span>
              <span className="size-1.5 rounded-full bg-[#2B66FE] animate-pulse" />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground truncate">
              Multi-Service OS
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1.5 py-1">
        {visibleSections.map((section) => (
          <SidebarGroup key={section.id} className="py-1">
            {section.title && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isActivePath(item, pathname)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "transition-all duration-150 rounded-lg text-xs font-medium",
                          active
                            ? "bg-gradient-to-r from-[#2B66FE] via-[#3872FF] to-[#1E50E2] text-white font-semibold shadow-[0_2px_8px_rgba(43,102,254,0.3)] hover:text-white"
                            : "text-slate-600 hover:text-slate-900 hover:bg-sidebar-accent dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={handleNavigate}
                          onPointerEnter={() => prefetchRoute(item.to)}
                          onFocus={() => prefetchRoute(item.to)}
                        >
                          <item.icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Ask AI assistant"
              className="h-9 rounded-lg border border-[#2B66FE]/20 bg-[#2B66FE]/5 text-[#2B66FE] hover:bg-[#2B66FE]/10 hover:text-[#2B66FE] dark:bg-[#2B66FE]/10 dark:text-blue-400 font-medium text-xs transition-colors"
            >
              <Link to="/ask" onClick={handleNavigate} className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-[#2B66FE] dark:text-blue-400" />
                <span className="truncate group-data-[collapsible=icon]:hidden font-semibold">Ask AI Assistant</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
