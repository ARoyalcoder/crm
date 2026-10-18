import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Plain table markup. `Table` scrolls sideways inside its container on narrow screens, so wide
 * tables never break the page layout.
 */
function Table({ className, containerClassName, ...props }: ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto rounded-2xl border border-border/80 dark:border-slate-800/80 bg-card shadow-soft hover:shadow-pop transition-shadow duration-200 table-scrollbar',
        containerClassName,
      )}
    >
      <table data-slot="table" className={cn('w-full caption-bottom text-xs sm:text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-border/80 dark:[&_tr]:border-slate-800 sticky top-0 z-10 bg-card', className)} {...props} />
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0 divide-y divide-border/40 dark:divide-slate-800/60', className)} {...props} />
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return <tfoot data-slot="table-footer" className={cn('border-t border-border/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/80 font-medium text-slate-800 dark:text-slate-200 [&>tr]:last:border-b-0', className)} {...props} />
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'group/row relative border-b border-border/50 dark:border-slate-800/60 transition-colors duration-150 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 data-[state=selected]:bg-blue-50/80 dark:data-[state=selected]:bg-blue-950/40',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-8 sm:h-8.5 bg-slate-100/85 dark:bg-slate-800/90 px-3 text-left align-middle text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-200 whitespace-nowrap first:rounded-tl-[16px] last:rounded-tr-[16px] border-b border-border/80 dark:border-slate-800 select-none',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('px-3 py-1.5 sm:py-2 align-middle text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 transition-colors', className)} {...props} />
}

function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return <caption data-slot="table-caption" className={cn('mt-3 text-sm text-muted-foreground dark:text-slate-400', className)} {...props} />
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
