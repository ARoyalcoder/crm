import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { servicesQuery } from '@/features/catalog/api'
import { formatRupees } from '@/lib/format'
import { blankItem, lineAmounts, type ItemsForm } from '../quotation-form'

const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_5rem_7rem_2.25rem]'

/** A cell with a small label that only shows on narrow screens, where the column headings are not. */
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground md:hidden">{label}</span>
      {children}
    </div>
  )
}

/**
 * The lines of a quotation: what is sold, how many, at what price, with its own discount and GST. Lines can start from a
 * catalog service (which fills in its name and price) or be typed freely. It must sit inside a form that has an `items` list.
 */
export function QuotationItemsEditor({ disabled = false }: { disabled?: boolean }) {
  const { control, setValue, formState } = useFormContext<ItemsForm>()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const services = useQuery(servicesQuery({ active: 'true', size: 100 }))

  const fromCatalog = (index: number, serviceId: string) => {
    const service = services.data?.items.find((candidate) => candidate.id === serviceId)
    if (!service) return
    setValue(`items.${index}.serviceId`, service.id, { shouldDirty: true })
    setValue(`items.${index}.serviceName`, service.name, { shouldDirty: true, shouldValidate: true })
    if (service.basePrice != null) setValue(`items.${index}.unitPrice`, String(service.basePrice), { shouldDirty: true, shouldValidate: true })
  }

  const listError = formState.errors.items?.root?.message ?? formState.errors.items?.message

  return (
    <section aria-labelledby="quotation-lines" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="quotation-lines" className="text-sm font-semibold">
          Lines
        </h3>
        {disabled ? null : (
          <Button type="button" variant="outline" size="sm" onClick={() => append(blankItem())}>
            <Plus aria-hidden="true" />
            Add a line
          </Button>
        )}
      </div>

      <div aria-hidden="true" className={`hidden gap-2 px-1 text-xs font-medium text-muted-foreground md:grid ${COLUMNS}`}>
        <span>Item</span>
        <span>Qty</span>
        <span>Unit price (₹)</span>
        <span>Discount %</span>
        <span>GST %</span>
        <span className="text-right">Line total</span>
        <span />
      </div>

      <ul className="grid gap-3">
        {fields.map((field, index) => {
          const row = items?.[index]
          const total = row ? lineAmounts(row).total : 0
          return (
            <li key={field.id} className={`grid gap-2 rounded-xl border bg-muted/30 p-3 md:items-start ${COLUMNS} md:border-0 md:bg-transparent md:p-0`}>
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground md:hidden">Item {index + 1}</span>
                <FormField
                  control={control}
                  name={`items.${index}.serviceName`}
                  render={({ field: name, fieldState }) => (
                    <div className="grid gap-1">
                      <Input aria-label={`Line ${index + 1}: item`} placeholder="What is being sold" disabled={disabled} aria-invalid={fieldState.error ? true : undefined} {...name} />
                      {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                    </div>
                  )}
                />
                <FormField
                  control={control}
                  name={`items.${index}.description`}
                  render={({ field: description }) => (
                    <Input aria-label={`Line ${index + 1}: notes`} placeholder="Model, size or other detail (optional)" disabled={disabled} className="h-8 text-xs md:h-8" {...description} />
                  )}
                />
                {disabled || !services.data?.items.length ? null : (
                  <Select
                    aria-label={`Line ${index + 1}: fill from the catalog`}
                    value=""
                    onChange={(event) => fromCatalog(index, event.target.value)}
                    className="h-8 text-xs md:h-8"
                  >
                    <option value="">Fill from the service catalog…</option>
                    {services.data.items.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                        {service.basePrice != null ? ` — ₹${service.basePrice}` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              {(
                [
                  ['quantity', 'Qty', 'quantity', 'any', '0'],
                  ['unitPrice', 'Unit price (₹)', 'unit price', 'any', '0'],
                  ['discountPercentage', 'Discount %', 'discount percentage', 'any', '0'],
                  ['taxPercentage', 'GST %', 'GST percentage', 'any', '0'],
                ] as const
              ).map(([name, label, spoken, step, min]) => (
                <Cell key={name} label={label}>
                  <FormField
                    control={control}
                    name={`items.${index}.${name}`}
                    render={({ field: input, fieldState }) => (
                      <div className="grid gap-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={min}
                          step={step}
                          disabled={disabled}
                          aria-label={`Line ${index + 1}: ${spoken}`}
                          aria-invalid={fieldState.error ? true : undefined}
                          className="tabular md:text-right"
                          {...input}
                        />
                        {fieldState.error ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                      </div>
                    )}
                  />
                </Cell>
              ))}

              <Cell label="Line total">
                <p className="flex h-10 items-center text-sm font-medium tabular md:h-9 md:justify-end">{formatRupees(total, { exact: true })}</p>
              </Cell>

              {disabled || fields.length <= 1 ? (
                <span />
              ) : (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${index + 1}`} onClick={() => remove(index)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {listError ? <p role="alert" className="text-sm text-destructive">{String(listError)}</p> : null}
    </section>
  )
}
