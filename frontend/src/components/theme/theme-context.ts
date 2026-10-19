import { createContext, useContext } from 'react'
import type { ThemeOrigin } from './theme-transition'

export type Theme = 'light' | 'dark'

export const ThemeContext = createContext<{
  theme: Theme
  /** `origin` is where the colour change spreads out from (use `originOf(button)`); without it the page fades. */
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void
} | null>(null)

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
