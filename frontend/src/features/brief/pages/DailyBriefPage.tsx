import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  Headphones,
  Info,
  ListChecks,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { briefApi, type BriefItem, type BriefSection } from '@/features/brief/api'
import { formatDate } from '@/lib/format'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Icon3D, type Icon3DTone } from '@/components/ui/icon-3d'

const TONE_TO_3D: Record<Tone, Icon3DTone> = {
  neutral: 'neutral',
  primary: 'primary',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  info: 'blue',
}

/** The icon the server names for a section, and how serious the section is (so warnings read as warnings). */
const SECTION_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  calendar: { icon: CalendarDays, tone: 'primary' },
  target: { icon: Target, tone: 'info' },
  'trending-up': { icon: TrendingUp, tone: 'success' },
  'alert-circle': { icon: CircleAlert, tone: 'danger' },
  clock: { icon: Clock3, tone: 'warning' },
  'list-checks': { icon: ListChecks, tone: 'primary' },
  'alert-triangle': { icon: TriangleAlert, tone: 'danger' },
  headphones: { icon: Headphones, tone: 'info' },
  shield: { icon: Shield, tone: 'warning' },
}

function BriefRow({ item }: { item: BriefItem }) {
  return (
    <li className="flex items-start gap-3 px-3.5 sm:px-5 py-2.5 sm:py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-xs text-muted-foreground">{item.label}</span>
        <span className="text-sm font-semibold">{item.value}</span>
        {item.detail ? <span className="text-xs text-muted-foreground">{item.detail}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.reason ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label={`Why am I seeing this? ${item.label}`}>
                <Info className="text-muted-foreground" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-72 max-w-72 text-sm">
              <p className="font-medium">Why you are seeing this</p>
              <p className="mt-1 text-muted-foreground">{item.reason}</p>
            </PopoverContent>
          </Popover>
        ) : null}
        {item.actionUrl ? (
          <Button asChild variant="ghost" size="icon" className="size-8 rounded-full">
            <Link to={item.actionUrl} aria-label={`Open ${item.label}`}>
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function Section({ section }: { section: BriefSection }) {
  const look = SECTION_LOOK[section.icon] ?? { icon: Sparkles, tone: 'primary' as Tone }
  const Icon = look.icon
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="flex items-center gap-3 text-base">
          <Icon3D
            icon={look.icon}
            size="md"
            tone={TONE_TO_3D[look.tone] ?? 'primary'}
            variant="solid-3d"
            tilt
          />
          <span className="flex-1">{section.title}</span>
          <Badge variant={section.items.length > 0 ? look.tone : 'neutral'}>{section.items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {section.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nothing here today.</p>
        ) : (
          <ul className="divide-y">
            {section.items.map((item, index) => (
              <BriefRow key={`${item.label}-${index}`} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/** Today's brief for the signed-in person: what is due, what is late and what is moving, in the parts of the business their role covers. */
export function DailyBriefPage() {
  const query = useQuery(briefApi.dailyQuery())
  const brief = query.data
  const allEmpty = brief ? brief.sections.every((section) => section.items.length === 0) : false

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Daily brief"
        icon={Sparkles}
        tone="amber"
        description={
          brief ? (
            <>
              {brief.greeting} <span className="text-muted-foreground">· {formatDate(brief.date)}</span>
            </>
          ) : (
            'What needs your attention today.'
          )
        }
        action={
          <Button variant="outline" onClick={() => void query.refetch()} loading={query.isFetching && !query.isPending}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      {query.isPending ? (
        <SkeletonLoader variant="card" height={320} label="Loading your brief" />
      ) : query.isError ? (
        <ErrorState title="Could not load your brief" error={query.error} onRetry={() => void query.refetch()} />
      ) : brief && brief.sections.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing to brief you on"
          description="Your role has nothing in the brief yet."
        />
      ) : allEmpty ? (
        <EmptyState icon={Sparkles} title="Your day looks clear" description="Nothing due, late or waiting on you." />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {brief?.sections.map((section) => (
            <Section key={section.title} section={section} />
          ))}
        </div>
      )}
    </div>
  )
}
