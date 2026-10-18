import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { workforceApi } from '@/features/workforce/api'

/** The team is small, so the whole list is fetched once and filtered as you type. */
function useEmployeeMatches(term: string): PickerMatches {
  const query = useQuery(workforceApi.listQuery({ status: 'ACTIVE' }))
  const needle = term.toLowerCase()
  return {
    options: query.data
      ?.map((employee) => ({
        id: employee.id,
        name: employee.fullName ?? employee.employeeCode,
        hint: `${employee.designation} · ${employee.employeeCode}`,
        data: { userId: employee.userId },
      }))
      .filter((option) => !needle || `${option.name} ${option.hint}`.toLowerCase().includes(needle))
      .slice(0, 12),
    isPending: query.isPending,
    error: query.error,
  }
}

type EmployeePickerProps = {
  value: PickerOption | null
  onChange: (employee: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Chooses an active employee by name, code or designation. The chosen option also carries the employee's user id, as `data.userId`. */
export function EmployeePicker(props: EmployeePickerProps) {
  return <EntityPicker noun="employee" minChars={0} placeholder="Type a name or role" useMatches={useEmployeeMatches} {...props} />
}
