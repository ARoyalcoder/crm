import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { candidatesQuery } from '../api'

function useCandidateMatches(term: string, enabled: boolean): PickerMatches {
  const query = useQuery({ ...candidatesQuery(term), enabled })
  return {
    options: query.data?.slice(0, 8).map((candidate) => ({
      id: candidate.id,
      name: candidate.fullName,
      hint: [candidate.email, candidate.location].filter(Boolean).join(' · '),
    })),
    isPending: query.isPending,
    error: query.error,
  }
}

type CandidatePickerProps = {
  value: PickerOption | null
  onChange: (candidate: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Finds a candidate by typing part of their name or email. */
export function CandidatePicker(props: CandidatePickerProps) {
  return <EntityPicker noun="candidate" placeholder="Type a name or email" useMatches={useCandidateMatches} {...props} />
}
