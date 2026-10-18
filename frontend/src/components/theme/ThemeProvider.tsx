import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ThemeContext, type Theme } from './theme-context'
import { runThemeTransition, type ThemeOrigin } from './theme-transition'

const STORAGE_KEY = 'pp-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
  } catch {
    return 'system'
  }
}

function isDark(theme: Theme) {
  return theme === 'dark' || (theme === 'system' && window.matchMedia(DARK_QUERY).matches)
}

/** Puts the page in the theme's colours. Synchronous and repeatable: the animation relies on both. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', isDark(theme))
}

/**
 * Light / dark / follow-the-system, remembered per browser. Toggles the `dark` class on <html>.
 *
 * Every change goes through `setTheme`, which plays the animation (see theme-transition.ts), so the
 * header menu, the sign-in page and an operating-system switch all look the same.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const chosen = useRef(theme)

  // First paint, and any state that arrives without going through setTheme: no animation.
  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  // "System" follows the operating system, and fades when it changes.
  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => runThemeTransition(() => applyTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme, origin?: ThemeOrigin) => {
    if (next === chosen.current) return
    chosen.current = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the choice simply is not remembered.
    }
    runThemeTransition(() => {
      // Both steps happen inside the transition callback, in one go, so the browser's "after"
      // picture already shows the new theme - class on <html> and React's own state (icons, toasts).
      applyTheme(next)
      flushSync(() => setThemeState(next))
    }, origin)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
