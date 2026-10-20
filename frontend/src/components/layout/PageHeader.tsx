import type { ReactNode, ElementType } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Icon3D, type Icon3DTone } from '@/components/ui/icon-3d'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Optional 3D animated icon to represent the page/module */
  icon?: ElementType
  tone?: Icon3DTone
  /** Button(s) on the right, e.g. "New service". */
  action?: ReactNode
  /** If set, shows a "back" link above the title. */
  back?: { to: string; label: string }
  /** Status badges or a short identifier shown beside the title. */
  meta?: ReactNode
}

/** Title block of a page: what it is, what it is for, and the main thing you can do here. */
export function PageHeader({ title, description, icon, tone, action, back, meta }: PageHeaderProps) {
  return (
    <header className="grid gap-1">
      {back ? (
        <Link
          to={back.to}
          className="flex w-fit items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground group"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
          {icon ? (
            <Icon3D icon={icon} size="xs" tone={tone ?? 'blue'} variant="solid-3d" float className="shrink-0" />
          ) : (
            <span className="size-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0 animate-pulse" />
          )}
          <h1 className="text-lg sm:text-xl leading-tight font-bold tracking-tight text-foreground">{title}</h1>
          {meta}
          {description && typeof description !== 'string' ? (
            <div className="text-xs text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-1.5">{action}</div> : null}
      </div>
    </header>
  )
}
