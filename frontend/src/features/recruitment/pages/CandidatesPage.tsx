import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Plus, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTable, dataTableColumns } from '@/components/data-table/DataTable'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/layout/PageHeader'
import { ListToolbar, Pagination, SearchInput } from '@/components/list/ListControls'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonLoader } from '@/components/shared/SkeletonLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useHasPermission } from '@/features/auth/auth-context'
import { formatRupees } from '@/lib/format'
import { useListParams } from '@/lib/use-list-params'
import { candidatesQuery, type Candidate } from '../api'
import { webAddress } from '../lib'

const PAGE_SIZE = 25
const column = dataTableColumns<Candidate>()

/** Everyone who has applied or been considered, with how to reach them and what they expect. */
export function CandidatesPage() {
  const params = useListParams()
  const canManage = useHasPermission('RECRUITMENT_MANAGE')
  const search = params.get('search')
  const candidates = useQuery(candidatesQuery(search || undefined))

  const rows = candidates.data ?? []
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const page = Math.min(params.page, pages - 1)

  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('fullName', {
          header: 'Candidate',
          cell: ({ row }) => {
            const link = webAddress(row.original.linkedInUrl)
            return (
              <span className="grid gap-0.5">
                <Link to={`/recruitment/candidates/${row.original.id}`} className="font-medium underline-offset-2 hover:underline">
                  {row.original.fullName}
                </Link>
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
                    LinkedIn
                    <ExternalLink className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : null}
              </span>
            )
          },
        }),
        column.accessor('email', {
          header: 'Contact',
          cell: ({ row }) => (
            <span className="grid gap-0.5">
              <span>{row.original.email}</span>
              {row.original.phone ? <span className="text-xs text-muted-foreground">{row.original.phone}</span> : null}
            </span>
          ),
        }),
        column.accessor('location', { header: 'Location', cell: ({ getValue }) => getValue() ?? '—' }),
        column.accessor('experienceYears', { header: 'Experience', cell: ({ getValue }) => (getValue() != null ? `${getValue()} years` : '—') }),
        column.accessor('expectedSalary', { header: 'Expects', cell: ({ getValue }) => (getValue() != null ? formatRupees(getValue()) : '—') }),
        column.accessor('noticePeriodDays', { header: 'Notice', cell: ({ getValue }) => (getValue() != null ? `${getValue()} days` : '—') }),
      ]),
    [],
  )

  const addCandidate = (
    <Button asChild>
      <Link to="/recruitment/candidates/new">
        <Plus aria-hidden="true" />
        Add candidate
      </Link>
    </Button>
  )

  return (
    <div className="grid gap-4">
      <PageHeader title="Candidates" description="The talent pool: everyone who applied or was considered." action={canManage ? addCandidate : null} />
      <Card>
        <CardContent className="grid gap-4">
          <ListToolbar onReset={search ? () => params.set('search', '') : undefined}>
            <SearchInput label="Search by name or email" value={search} onChange={(value) => params.set('search', value)} />
          </ListToolbar>
          {candidates.isPending ? (
            <SkeletonLoader variant="table" label="Loading candidates" />
          ) : candidates.isError ? (
            <ErrorState title="Could not load the candidates" error={candidates.error} onRetry={() => void candidates.refetch()} />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
                caption="Candidates"
                empty={
                  <EmptyState
                    variant="compact"
                    icon={UserRound}
                    title={search ? 'No candidate matches' : 'No candidates yet'}
                    description={search ? 'Try another name or email.' : 'Add the first candidate to build the talent pool.'}
                    action={search || !canManage ? undefined : addCandidate}
                  />
                }
              />
              <Pagination page={page} totalPages={pages} totalItems={rows.length} noun="candidates" singular="candidate" onPageChange={params.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
