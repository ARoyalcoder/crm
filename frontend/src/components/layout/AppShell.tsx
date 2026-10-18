import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { AmbientBackdrop } from '@/components/layout/AmbientBackdrop'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/layout/PageTransition'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

/**
 * The frame around every signed-in page: a skip link, the modern shadcn AppSidebar (auto-collapsing rail,
 * responsive mobile drawer, keyboard shortcut Ctrl+B), the header with SidebarTrigger, and the page itself
 * inside its own error boundary.
 */
export function AppShell() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative flex min-h-svh w-full bg-background text-foreground transition-colors duration-500">
        {/* Ambient floating orbs and glow */}
        <AmbientBackdrop />

        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>

        {/* Shadcn AppSidebar */}
        <AppSidebar />

        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-transparent">
          <Header />

          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1440px] px-3 py-2.5 sm:px-3.5 sm:py-3 lg:px-4 lg:py-3 xl:px-5 xl:py-3 2xl:px-6 min-w-0">
              <div className="mb-2 xl:hidden">
                <Breadcrumbs />
              </div>
              <ErrorBoundary resetKey={pathname}>
                <Suspense fallback={<SkeletonLoader variant="page" label="Loading page" />}>
                  <PageTransition locationKey={pathname}>
                    <Outlet />
                  </PageTransition>
                </Suspense>
              </ErrorBoundary>
          </div>
        </main>
      </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

/** Standalone Layout component with children matching the standard shadcn Layout pattern */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="min-w-0 flex-1">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}

export default AppShell
