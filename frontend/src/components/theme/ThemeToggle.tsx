import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme, type Theme } from './theme-context'
import { originOf } from './theme-transition'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // The colour change spreads out from the button (see theme-transition.ts).
  const handleSelect = (nextTheme: Theme) => setTheme(nextTheme, originOf(buttonRef.current))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          aria-label="Change theme"
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
              className="relative z-10 flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Moon className="size-4.5 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" aria-hidden="true" />
              ) : theme === 'light' ? (
                <Sun className="size-4.5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" aria-hidden="true" />
              ) : (
                <Monitor className="size-4.5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-38 p-1.5 rounded-2xl shadow-pop border border-border/80 dark:border-slate-800/80 bg-popover/95 backdrop-blur-xl">
        <DropdownMenuItem
          onSelect={() => handleSelect('light')}
          className={cn(
            'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors',
            theme === 'light' ? 'bg-primary/10 text-primary font-semibold dark:bg-blue-500/15 dark:text-blue-400' : 'text-foreground hover:bg-accent/60'
          )}
        >
          <span className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" aria-hidden="true" />
            <span>Light</span>
          </span>
          {theme === 'light' && <Check className="size-3.5 text-primary dark:text-blue-400" aria-hidden="true" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => handleSelect('dark')}
          className={cn(
            'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors',
            theme === 'dark' ? 'bg-primary/10 text-primary font-semibold dark:bg-blue-500/15 dark:text-blue-400' : 'text-foreground hover:bg-accent/60'
          )}
        >
          <span className="flex items-center gap-2">
            <Moon className="size-4 text-blue-400" aria-hidden="true" />
            <span>Dark</span>
          </span>
          {theme === 'dark' && <Check className="size-3.5 text-primary dark:text-blue-400" aria-hidden="true" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => handleSelect('system')}
          className={cn(
            'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors',
            theme === 'system' ? 'bg-primary/10 text-primary font-semibold dark:bg-blue-500/15 dark:text-blue-400' : 'text-foreground hover:bg-accent/60'
          )}
        >
          <span className="flex items-center gap-2">
            <Monitor className="size-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <span>System</span>
          </span>
          {theme === 'system' && <Check className="size-3.5 text-primary dark:text-blue-400" aria-hidden="true" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
