import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/components/theme/theme-context'

/** App-wide toast host. Call `toast.success(...)` / `toast.error(...)` from `sonner` after real outcomes. */
export function Toaster() {
  const { theme } = useTheme()
  return <Sonner theme={theme} position="bottom-right" richColors closeButton />
}
