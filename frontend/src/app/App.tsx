import { Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Loader } from '@/components/ui/Loader'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              {/* Pages outside the app shell (login, print view) are lazy too, so they need their own boundary. */}
              <Suspense fallback={<div className="flex min-h-svh items-center justify-center bg-background"><Loader /></div>}>
                <RouterProvider router={router} />
              </Suspense>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
