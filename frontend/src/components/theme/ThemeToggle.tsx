import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun } from '@/components/animate-ui/icons/sun'
import { Moon } from '@/components/animate-ui/icons/moon'
import { useTheme } from './theme-context'
import { originOf } from './theme-transition'
import { cn } from '@/lib/utils'

/** Single-click direct toggle between Light and Dark themes with ripple transition. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme, originOf(buttonRef.current))
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="relative size-9.5 rounded-full flex items-center justify-center bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-amber-300 shadow-[3px_3px_10px_rgba(180,195,225,0.4),-3px_-3px_10px_rgba(255,255,255,0.95)] dark:shadow-[3px_3px_10px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.04)] border border-white/80 dark:border-slate-800 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 overflow-hidden group"
    >
      {/* Ambient luminous glow behind icon */}
      <span
        className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-100',
          theme === 'dark'
            ? 'bg-gradient-to-tr from-indigo-500/25 via-blue-400/20 to-sky-300/10'
            : 'bg-gradient-to-tr from-amber-400/25 via-orange-300/20 to-yellow-200/10'
        )}
        aria-hidden="true"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ rotate: -80, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 80, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex items-center justify-center pointer-events-none"
        >
          {theme === 'dark' ? (
            <Moon animateOnHover className="size-4.5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" aria-hidden="true" />
          ) : (
            <Sun animateOnHover className="size-4.5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" aria-hidden="true" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
