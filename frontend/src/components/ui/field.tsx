import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function Field({ className, children, ...props }: FieldProps) {
  return (
    <div data-slot="field" className={cn('flex flex-col gap-1.5', className)} {...props}>
      {children}
    </div>
  )
}

export function FieldLabel({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label data-slot="field-label" className={cn('text-xs font-semibold text-foreground', className)} {...props}>
      {children}
    </label>
  )
}

export function FieldDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="field-description" className={cn('text-xs text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

export function FieldError({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="field-error" className={cn('text-xs text-destructive font-medium', className)} {...props}>
      {children}
    </p>
  )
}
