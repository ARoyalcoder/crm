import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { servicesQuery } from '@/features/catalog/api'

function useServiceMatches(term: string): PickerMatches {
  const query = useQuery(servicesQuery({ search: term || undefined, active: 'true', size: 12 }))
  return {
    options: query.data?.items.map((service) => ({
      id: service.id,
      name: service.name,
      hint: service.vertical.name,
      // What a quotation line needs to start from: the catalog price and unit, as text.
      data: service.basePrice != null ? { price: String(service.basePrice), unit: service.unitLabel ?? '' } : undefined,
    })),
    isPending: query.isPending,
    error: query.error,
  }
}

type ServicePickerProps = {
  value: PickerOption | null
  onChange: (service: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Chooses a service from the catalog by name. */
export function ServicePicker(props: ServicePickerProps) {
  return <EntityPicker noun="service" minChars={0} placeholder="Type a service name" useMatches={useServiceMatches} {...props} />
}
