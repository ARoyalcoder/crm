import { formatRupees } from '@/lib/format'

type QuotationTotalsProps = {
  totals: { subtotal: number; discount: number; tax: number; total: number }
}

/** What the customer would pay: the lines before tax, any discount, the GST and the total. */
export function QuotationTotals({ totals }: QuotationTotalsProps) {
  return (
    <dl className="grid gap-1.5 rounded-xl border bg-card p-3 text-sm" aria-label="Quotation total" aria-live="polite">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Before tax</dt>
        <dd className="tabular">{formatRupees(totals.subtotal, { exact: true })}</dd>
      </div>
      {totals.discount > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="tabular">−{formatRupees(totals.discount, { exact: true })}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">GST</dt>
        <dd className="tabular">{formatRupees(totals.tax, { exact: true })}</dd>
      </div>
      <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
        <dt>Total</dt>
        <dd className="tabular">{formatRupees(totals.total, { exact: true })}</dd>
      </div>
    </dl>
  )
}
