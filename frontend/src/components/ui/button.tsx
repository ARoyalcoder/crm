import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold tracking-wide whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-[0.97] cursor-pointer overflow-hidden group select-none before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000 before:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#2B66FE] via-[#3872FF] to-[#1E50E2] text-white shadow-[0_4px_14px_-2px_rgba(43,102,254,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(43,102,254,0.55)] hover:scale-[1.02] active:shadow-md',
        soft:
          'bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50/90 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-slate-900 text-[#2B66FE] dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60 shadow-[0_3px_12px_rgba(43,102,254,0.12)] hover:shadow-[0_6px_18px_rgba(43,102,254,0.22)] hover:border-blue-400 hover:scale-[1.02] before:via-blue-300/20',
        outline:
          'border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-[3px_3px_10px_rgba(195,208,230,0.3),-3px_-3px_10px_rgba(255,255,255,0.9)] dark:shadow-[3px_3px_10px_rgba(0,0,0,0.4),-2px_-2px_8px_rgba(255,255,255,0.03)] hover:border-blue-300 dark:hover:border-blue-600 hover:text-[#2B66FE] dark:hover:text-blue-400 hover:scale-[1.02] before:via-black/5 dark:before:via-white/10',
        secondary:
          'bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900 text-white dark:from-slate-700 dark:via-slate-750 dark:to-slate-800 dark:text-slate-100 shadow-[0_4px_14px_-2px_rgba(15,23,42,0.35)] hover:shadow-[0_6px_20px_-2px_rgba(15,23,42,0.5)] hover:scale-[1.02] active:shadow-md',
        ghost:
          'text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800/70 hover:scale-[1.02] before:via-black/5 dark:before:via-white/10',
        destructive:
          'bg-gradient-to-r from-[#E11D48] via-[#F43F5E] to-[#BE123C] text-white shadow-[0_4px_14px_-2px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(225,29,72,0.55)] hover:scale-[1.02] active:shadow-md',
        success:
          'bg-gradient-to-r from-[#059669] via-[#10B981] to-[#047857] text-white shadow-[0_4px_14px_-2px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_20px_-2px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:shadow-md',
        link: 'text-primary underline-offset-4 hover:underline hover:scale-[1.01] before:hidden',
      },
      size: {
        default: 'h-8 sm:h-8.5 px-3 sm:px-3.5 py-1 text-xs sm:text-[12.5px]',
        sm: 'h-6.5 sm:h-7 px-2.5 py-0.5 text-[11px]',
        lg: 'h-10 sm:h-10.5 px-5 py-2 text-sm font-bold',
        icon: 'size-7.5 sm:size-8 rounded-full p-0 flex items-center justify-center',
        'icon-sm': 'size-7 rounded-lg p-0 flex items-center justify-center',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a router Link) with button styling instead of a <button>. */
    asChild?: boolean
    /** Shows a spinner and blocks further clicks while a request is in flight. */
    loading?: boolean
  }

function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  if (asChild) {
    return (
      <Slot data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>
        {children}
      </Slot>
    )
  }
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
