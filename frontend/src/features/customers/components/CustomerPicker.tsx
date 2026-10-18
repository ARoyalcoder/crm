import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { customersQuery } from '@/features/customers/api'

function useCustomerMatches(term: string, enabled: boolean): PickerMatches {
  const query = useQuery({ ...customersQuery({ search: term }), enabled })
  return {
    options: query.data?.items.slice(0, 8).map((customer) => ({ id: customer.id, name: customer.displayName, hint: customer.customerNumber })),
    isPending: query.isPending,
    error: query.error,
  }
}

type CustomerPickerProps = {
  value: PickerOption | null
  onChange: (customer: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Finds a customer by typing part of the name, number, phone or email. */
export function CustomerPicker(props: CustomerPickerProps) {
  return <EntityPicker noun="customer" placeholder="Type a name, number or phone" useMatches={useCustomerMatches} {...props} />
}
