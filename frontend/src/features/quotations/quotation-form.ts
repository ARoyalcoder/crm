import { z } from 'zod'
import type { ItemInput, QuotationItem } from './api'

/** A percentage typed into a box: empty is fine (it means zero), otherwise 0 to 100. */
const percentage = z.string().refine((value) => value === '' || (Number(value) >= 0 && Number(value) <= 100), 'Use 0 to 100')

/** One quotation line as the form holds it. Numbers stay text while they are being typed. */
export const itemFormSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string().trim().min(1, 'Name this line'),
  description: z.string(),
  quantity: z.string().refine((value) => value !== '' && Number(value) > 0, 'More than zero'),
  unitPrice: z.string().refine((value) => value !== '' && Number(value) >= 0, 'Enter a price'),
  discountPercentage: percentage,
  taxPercentage: percentage,
})
export type ItemFormValue = z.infer<typeof itemFormSchema>

export const itemsFormSchema = z.array(itemFormSchema).min(1, 'Add at least one line')

/** The shape the line editor needs from whichever form it sits in. */
export type ItemsForm = { items: ItemFormValue[] }

export const DEFAULT_GST = '18'

export function blankItem(): ItemFormValue {
  return { serviceId: '', serviceName: '', description: '', quantity: '1', unitPrice: '', discountPercentage: '0', taxPercentage: DEFAULT_GST }
}

export function itemFromSaved(item: QuotationItem): ItemFormValue {
  return {
    serviceId: item.serviceId ?? '',
    serviceName: item.serviceName,
    description: item.description ?? '',
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountPercentage: item.discountPercentage ? String(item.discountPercentage) : '0',
    taxPercentage: item.taxPercentage != null ? String(item.taxPercentage) : '0',
  }
}

const number = (value: string) => (value === '' ? 0 : Number(value))

export function itemToInput(item: ItemFormValue): ItemInput {
  return {
    serviceId: item.serviceId || null,
    serviceName: item.serviceName.trim(),
    description: item.description.trim() || null,
    quantity: number(item.quantity),
    unitPrice: number(item.unitPrice),
    discountPercentage: number(item.discountPercentage),
    taxPercentage: number(item.taxPercentage),
  }
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** One line's money: before tax and after its own discount, the GST on it, and the line total. */
export function lineAmounts(item: ItemFormValue) {
  const raw = number(item.quantity) * number(item.unitPrice)
  const discount = round2((raw * number(item.discountPercentage)) / 100)
  const net = Math.max(0, raw - discount)
  const tax = round2((net * number(item.taxPercentage)) / 100)
  return { net, tax, total: net + tax }
}

/**
 * The quotation's money, worked out the way the server does it: lines before tax, the quotation-wide discount off
 * that, and the lines' GST reduced in the same proportion. A quotation-wide rate is used only when no line has GST.
 */
export function quotationTotals(items: ItemFormValue[], discountPercentage: number, fallbackTaxPercentage = 0) {
  let lineNet = 0
  let lineTax = 0
  for (const item of items) {
    const amounts = lineAmounts(item)
    lineNet += amounts.net
    lineTax += amounts.tax
  }
  const discount = round2((lineNet * discountPercentage) / 100)
  const afterDiscount = Math.max(0, lineNet - discount)
  const tax =
    lineTax > 0 && lineNet > 0 ? round2((lineTax * afterDiscount) / lineNet) : fallbackTaxPercentage > 0 ? round2((afterDiscount * fallbackTaxPercentage) / 100) : 0
  return { subtotal: lineNet, discount, tax, total: afterDiscount + tax }
}
