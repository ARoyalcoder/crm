import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import type { PickerOption } from '@/components/shared/EntityPicker'

type EntityPickerFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> = {
  control: Control<TValues>
  name: TName
  label: string
  required?: boolean
  /** Renders the picker; gets the props to pass on: the chosen record, how to change it, and the form's error message. */
  children: (props: {
    id: string
    value: PickerOption | null
    onChange: (value: PickerOption | null) => void
    error?: string
  }) => ReactNode
}

/**
 * Ties a record picker (customer, project, employee...) into a react-hook-form form: the label points at the search
 * box, and the form's validation message for the field shows under it.
 */
export function EntityPickerField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  required,
  children,
}: EntityPickerFieldProps<TValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel htmlFor={`${name}-picker`}>
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
          </FormLabel>
          {children({
            id: `${name}-picker`,
            value: (field.value ?? null) as PickerOption | null,
            onChange: field.onChange,
            error: fieldState.error?.message,
          })}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
