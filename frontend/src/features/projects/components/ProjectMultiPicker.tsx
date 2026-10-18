import { X } from 'lucide-react'
import type { PickerOption } from '@/components/shared/EntityPicker'
import { ProjectPicker } from './ProjectPicker'

type ProjectMultiPickerProps = {
  value: PickerOption[]
  onChange: (projects: PickerOption[]) => void
  id?: string
}

/** Chooses several projects by name: the chosen ones show as removable chips, and the search box adds another. */
export function ProjectMultiPicker({ value, onChange, id }: ProjectMultiPickerProps) {
  return (
    <div className="grid gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen projects">
          {value.map((project) => (
            <li key={project.id} className="flex items-center gap-1.5 rounded-full border bg-accent/50 py-1 pr-1 pl-3 text-sm">
              <span className="max-w-[16rem] truncate">{project.name}</span>
              <button
                type="button"
                aria-label={`Remove ${project.name}`}
                onClick={() => onChange(value.filter((candidate) => candidate.id !== project.id))}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ProjectPicker
        id={id}
        value={null}
        onChange={(option) => {
          if (option && !value.some((candidate) => candidate.id === option.id)) onChange([...value, option])
        }}
      />
    </div>
  )
}
