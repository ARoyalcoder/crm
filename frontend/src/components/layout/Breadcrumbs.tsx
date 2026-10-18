import { Fragment, useContext } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, UNSAFE_DataRouterContext, matchRoutes, useLocation } from 'react-router-dom'
import { navigation } from '@/config/navigation'

const labelByPath = new Map<string, string>(navigation.flatMap((s) => s.items.map((i) => [i.to, i.label] as const)))

const SEGMENT_LABELS: Record<string, string> = {
  new: 'New',
  edit: 'Edit',
  admin: 'Administration',
  mine: 'Mine',
}

const looksLikeId = (segment: string) => /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)

function humanize(segment: string) {
  const known = SEGMENT_LABELS[segment]
  if (known) return known
  if (looksLikeId(segment)) return 'Details'
  const text = segment.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Whether a page exists at an address. A step of the trail with no page of its own ("Recruitment", which only groups
 * other pages) is shown as text, so the trail never links to the "page not found" screen.
 */
function usePageExists() {
  const router = useContext(UNSAFE_DataRouterContext)?.router
  return (to: string) => {
    if (!router) return true
    const matches = matchRoutes(router.routes, to)
    const last = matches?.[matches.length - 1]
    return last !== undefined && last.route.path !== '*'
  }
}

/** Trail derived from the URL, using navigation labels where a prefix matches a menu entry. */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const pageExists = usePageExists()
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const to = '/' + segments.slice(0, index + 1).join('/')
    return { to, label: labelByPath.get(to) ?? humanize(segment), linkable: pageExists(to) }
  })

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        <li className="hidden sm:block">
          <Link to="/" className="rounded hover:text-foreground">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <Fragment key={crumb.to}>
              <li aria-hidden="true" className={index === 0 ? 'hidden sm:block' : 'hidden sm:block'}>
                <ChevronRight className="size-3.5" />
              </li>
              <li className={last ? 'min-w-0' : 'hidden sm:block'}>
                {last ? (
                  <span aria-current="page" className="block truncate font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : crumb.linkable ? (
                  <Link to={crumb.to} className="rounded hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
