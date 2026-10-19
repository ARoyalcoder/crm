import { useQuery } from '@tanstack/react-query'
import { EntityPicker, type PickerMatches, type PickerOption } from '@/components/shared/EntityPicker'
import { projectsApi } from '@/features/projects/api'

function useProjectMatches(term: string, enabled: boolean): PickerMatches {
  const query = useQuery({ ...projectsApi.listQuery({ search: term, size: 8 }), enabled })
  return {
    options: query.data?.items.map((project) => ({ id: project.id, name: project.title, hint: project.customerName })),
    isPending: query.isPending,
    error: query.error,
  }
}

type ProjectPickerProps = {
  value: PickerOption | null
  onChange: (project: PickerOption | null) => void
  error?: string
  id?: string
  disabled?: boolean
}

/** Finds a project by typing part of its title or customer. */
export function ProjectPicker(props: ProjectPickerProps) {
  return <EntityPicker noun="project" placeholder="Type a title or customer" useMatches={useProjectMatches} {...props} />
}
