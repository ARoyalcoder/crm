import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { jobsQuery } from '../api'

/** Only jobs that are open can be applied to, and there are few, so the list is fetched once and filtered as you type. */
function useOpenJobMatches(term: string): PickerMatches {
  const query = useQuery(jobsQuery('OPEN'))
  const needle = term.toLowerCase()
  return {
    options: query.data
      ?.map((job) => ({
        id: job.id,
        name: job.title,
        hint: [job.department, job.location].filter(Boolean).join(' · '),
      }))
      .filter((option) => !needle || `${option.name} ${option.hint}`.toLowerCase().includes(needle))
      .slice(0, 12),
    isPending: query.isPending,
    error: query.error,
  }
}

type JobPickerProps = {
  value: PickerOption | null
  onChange: (job: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Chooses one of the jobs that is open for applications. */
export function JobPicker(props: JobPickerProps) {
  return <EntityPicker noun="open job" minChars={0} placeholder="Type a job title" useMatches={useOpenJobMatches} {...props} />
}
