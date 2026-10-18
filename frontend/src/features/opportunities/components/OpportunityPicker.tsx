import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { opportunitiesQuery } from '@/features/opportunities/api'

function useOpportunityMatches(term: string, enabled: boolean): PickerMatches {
  const query = useQuery({ ...opportunitiesQuery({ filters: { search: term }, size: 8 }), enabled })
  return {
    options: query.data?.items.map((opportunity) => ({
      id: opportunity.id,
      name: opportunity.title,
      hint: [opportunity.customerName ?? opportunity.leadName, opportunity.stageName].filter(Boolean).join(' · '),
    })),
    isPending: query.isPending,
    error: query.error,
  }
}

type OpportunityPickerProps = {
  value: PickerOption | null
  onChange: (opportunity: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Finds a deal in the pipeline by typing part of its title. */
export function OpportunityPicker(props: OpportunityPickerProps) {
  return <EntityPicker noun="deal" placeholder="Type the deal's title" useMatches={useOpportunityMatches} {...props} />
}
