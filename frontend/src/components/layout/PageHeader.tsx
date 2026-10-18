import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Button(s) on the right, e.g. "New service". */
  action?: ReactNode
  /** If set, shows a "back" link above the title. */
  back?: { to: string; label: string }
  /** Status badges or a short identifier shown beside the title. */
  meta?: ReactNode
}

/** Title block of a page: what it is, what it is for, and the main thing you can do here. */
export function PageHeader({ title, description, action, back, meta }: PageHeaderProps) {
  return (
    <header className="grid gap-1">
      {back ? (
        <Link
          to={back.to}
          className="flex w-fit items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <span className="size-1.5 rounded-full bg-[#2B66FE] shrink-0" />
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
