import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { controlClass } from '@/components/ui/input'

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn('flex min-h-20 py-2', controlClass, className)} {...props} />
}

export { Textarea }
