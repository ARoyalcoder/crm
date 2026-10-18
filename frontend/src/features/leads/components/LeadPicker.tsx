import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { leadsQuery } from '@/features/leads/api'

function useLeadMatches(term: string, enabled: boolean): PickerMatches {
  const query = useQuery({ ...leadsQuery({ search: term }), enabled })
  return {
    options: query.data?.items.slice(0, 8).map((lead) => ({
      id: lead.id,
      name: lead.contactName,
      hint: [lead.companyName, lead.leadNumber].filter(Boolean).join(' · '),
    })),
    isPending: query.isPending,
    error: query.error,
  }
}

type LeadPickerProps = {
  value: PickerOption | null
  onChange: (lead: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Finds a lead by typing part of the contact's name, company, number, phone or email. */
export function LeadPicker(props: LeadPickerProps) {
  return <EntityPicker noun="lead" placeholder="Type a name, company or number" useMatches={useLeadMatches} {...props} />
}
