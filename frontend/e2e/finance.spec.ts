import { expect, test, type Page, type Route } from '@playwright/test'
import { mockSignedIn, mockSystemInfo, mockVerticals, pageOf, problem } from './support'

const VIEW = ['FINANCE_VIEW', 'CUSTOMER_VIEW']
const BOOKKEEPER = [...VIEW, 'FINANCE_MANAGE']
const ACCOUNTANT = [...BOOKKEEPER, 'FINANCE_APPROVE', 'FINANCE_CONFIGURE']
const CUSTOMER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const INVOICE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const PAYMENT = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const CASH = 'c0000000-0000-0000-0000-000000000001'
const UPI = 'c0000000-0000-0000-0000-000000000002'

test.use({ timezoneId: 'Asia/Kolkata', locale: 'en-IN' })

const METHODS = [
  { id: CASH, code: 'CASH', name: 'Cash', requiresReference: false, active: true, displayOrder: 1, version: 0 },
  { id: UPI, code: 'UPI', name: 'UPI', requiresReference: true, active: true, displayOrder: 2, version: 0 },
]

function invoiceSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE, invoiceNumber: 'INV-2627-000007', status: 'ISSUED', customerId: CUSTOMER, customerName: 'Acme Solar',
    issueDate: '2026-10-01', dueDate: '2026-10-16', currency: 'INR', total: 118000, amountPaid: 0, outstanding: 118000,
    daysOverdue: null as number | null, ...overrides,
  }
}

function actionsFor(status: string, permissions: string[], untouched = true) {
  const manage = permissions.includes('FINANCE_MANAGE')
  const approve = permissions.includes('FINANCE_APPROVE')
  const open = status === 'ISSUED' || status === 'PARTIALLY_PAID' || status === 'OVERDUE'
  return {
    edit: manage && status === 'DRAFT', issue: manage && status === 'DRAFT', discard: manage && status === 'DRAFT',
    recordPayment: manage && open, creditNote: approve && open, debitNote: approve && (open || status === 'PAID'),
    cancel: approve && status === 'ISSUED' && untouched,
  }
}

type InvoiceState = ReturnType<typeof invoiceDetail>

function invoiceDetail(permissions: string[], overrides: Record<string, unknown> = {}) {
  return {
    invoice: invoiceSummary(),
    billingAddress: '12 MG Road\nLucknow, Uttar Pradesh 226001' as string | null,
    customerTaxId: '09AAACA1234A1Z5' as string | null,
    reference: 'PO-7781' as string | null,
    paymentTermsDays: 15,
    notes: 'Thank you for your business.' as string | null,
    terms: null as string | null,
    subtotal: 100000, discountTotal: 0, taxTotal: 18000, creditTotal: 0, debitTotal: 0,
    items: [
      { id: 'l1', serviceId: null, description: 'Dome camera, installed', hsnSac: '8525', quantity: 8, unit: 'pcs',
        unitPrice: 12500, discountPercent: 0, taxPercent: 18, lineSubtotal: 100000, discountAmount: 0, taxAmount: 18000, lineTotal: 118000 },
    ],
    payments: [] as Record<string, unknown>[],
    creditNotes: [] as Record<string, unknown>[],
    debitNotes: [] as Record<string, unknown>[],
    seller: { name: 'Pawan Putra Pvt Ltd', taxId: '09AAACP9999P1Z1', email: 'accounts@example.com', phone: '0522 400 0000', address: '4 Station Road\nLucknow, Uttar Pradesh 226001' },
    issuedAt: '2026-10-01T05:00:00Z' as string | null,
    issuedByName: 'Asha Verma' as string | null,
    cancelledAt: null as string | null,
    cancellationReason: null as string | null,
    actions: actionsFor('ISSUED', permissions),
    version: 3,
    ...overrides,
  }
}

function paymentSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT, paymentNumber: 'RCT-2627-000004', status: 'RECEIVED', customerId: CUSTOMER, customerName: 'Acme Solar',
    receivedOn: '2026-10-10', currency: 'INR', amount: 50000, allocated: 30000, refunded: 0, unallocated: 20000,
    methodName: 'UPI', reference: 'UTR 4411' as string | null, ...overrides,
  }
}

type PaymentState = ReturnType<typeof paymentDetail>

function paymentDetail(overrides: Record<string, unknown> = {}) {
  return {
    payment: paymentSummary(),
    notes: null as string | null,
    source: 'MANUAL', gateway: null as string | null, recordedByName: 'Asha Verma', recordedAt: '2026-10-10T06:00:00Z',
    reversedAt: null as string | null, reversedByName: null as string | null, reversalReason: null as string | null,
    allocations: [
      { id: 'a1', invoiceId: INVOICE, invoiceNumber: 'INV-2627-000007', amount: 30000, released: false,
        releaseReason: null as string | null, allocatedByName: 'Asha Verma', allocatedAt: '2026-10-10T06:00:00Z' },
    ],
    refunds: [] as Record<string, unknown>[],
    actions: { allocate: true, release: true, refund: true, reverse: true },
    ...overrides,
  }
}

const SUMMARY = {
  outstanding: 245000, overdue: 60000, dueSoon: 118000, openInvoices: 3, overdueInvoices: 1, draftInvoices: 1,
  unallocatedPayments: 20000, invoicedThisMonth: 236000, receivedThisMonth: 50000, currency: 'INR', asOf: '2026-10-10',
}

async function signIn(page: Page, permissions: string[]) {
  await mockSignedIn(page, permissions)
  await mockSystemInfo(page)
  await mockVerticals(page)
  await page.route('**/api/v1/finance/summary', (route) => route.fulfill({ json: SUMMARY }))
  await page.route('**/api/v1/finance/settings', (route) =>
    route.fulfill({ json: { currency: 'INR', defaultPaymentTermsDays: 15, defaultTaxPercent: 18, today: '2026-10-10' } }),
  )
  await page.route('**/api/v1/payment-methods*', (route) => route.fulfill({ json: METHODS }))
  await page.route('**/api/v1/customers?*', (route) =>
    route.fulfill({
      json: pageOf([{ id: CUSTOMER, customerNumber: 'CUS-000042', type: 'BUSINESS', displayName: 'Acme Solar', email: null,
        phone: '9876543210', status: 'ACTIVE', source: null, assignedTo: null, tags: [], createdAt: '2026-01-01T00:00:00Z' }]),
    }),
  )
}

type Call = { method: string; path: string; body: unknown; key: string | undefined }

/** A stand-in for the server that keeps one invoice and applies each request to it, like the real one. */
async function mockInvoice(page: Page, state: InvoiceState, permissions: string[], log: Call[] = []) {
  const resettle = () => {
    const outstanding = state.invoice.total + state.debitTotal - state.creditTotal - state.invoice.amountPaid
    const status = outstanding <= 0 ? 'PAID' : state.invoice.amountPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED'
    state.invoice = { ...state.invoice, outstanding, status }
    state.actions = actionsFor(status, permissions, state.creditTotal === 0 && state.debitTotal === 0 && state.invoice.amountPaid === 0)
  }
  await page.route(`**/api/v1/invoices/${INVOICE}`, (route) => {
    if (route.request().method() === 'DELETE') {
      log.push({ method: 'DELETE', path: '', body: null, key: undefined })
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: state })
  })
  await page.route(`**/api/v1/invoices/${INVOICE}/**`, (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.split(`${INVOICE}/`)[1]
    const body = request.postDataJSON() as Record<string, unknown>
    log.push({ method: request.method(), path, body, key: request.headers()['idempotency-key'] })
    if (path === 'issue') {
      state.invoice = { ...state.invoice, invoiceNumber: 'INV-2627-000008', issueDate: body.issueDate as string, dueDate: body.dueDate as string }
      state.issuedByName = 'Asha Verma'
      resettle()
    } else if (path === 'credit-notes') {
      if ((body.amount as number) > state.invoice.outstanding) {
        return route.fulfill(problem(422, 'BUSINESS_RULE_VIOLATION', 'Invoice INV-2627-000007 has only ₹1,18,000 outstanding. To credit more, release that much of its payments first.'))
      }
      state.creditTotal += body.amount as number
      state.creditNotes = [...state.creditNotes, { id: 'cn1', noteNumber: 'CRN-2627-000001', noteDate: '2026-10-10', amount: body.amount, reason: body.reason, issuedByName: 'Asha Verma', createdAt: '2026-10-10T07:00:00Z' }]
      resettle()
    } else if (path === 'debit-notes') {
      state.debitTotal += body.amount as number
      state.debitNotes = [...state.debitNotes, { id: 'dn1', noteNumber: 'DBN-2627-000001', noteDate: '2026-10-10', amount: body.amount, reason: body.reason, issuedByName: 'Asha Verma', createdAt: '2026-10-10T07:30:00Z' }]
      resettle()
    } else if (path === 'cancel') {
      state.invoice = { ...state.invoice, status: 'CANCELLED', outstanding: 0 }
      state.cancelledAt = '2026-10-10T08:00:00Z'
      state.cancellationReason = body.reason as string
      state.actions = actionsFor('CANCELLED', permissions)
    }
    return route.fulfill({ status: path === 'issue' || path === 'cancel' ? 200 : 201, json: state })
  })
}

// ------------------------------------------------------------------ the invoice list

test('the invoice list shows what is owed and each invoice with its status in words', async ({ page }) => {
  await signIn(page, BOOKKEEPER)
  const requests: string[] = []
  await page.route('**/api/v1/invoices?*', (route) => {
    requests.push(new URL(route.request().url()).search)
    return route.fulfill({
      json: pageOf([
        invoiceSummary(),
        invoiceSummary({ id: 'i2', invoiceNumber: 'INV-2627-000003', status: 'OVERDUE', dueDate: '2026-09-20', total: 60000, outstanding: 60000, daysOverdue: 20 }),
        invoiceSummary({ id: 'i3', invoiceNumber: 'INV-2627-000002', status: 'PAID', total: 45000, amountPaid: 45000, outstanding: 0 }),
        invoiceSummary({ id: 'i4', invoiceNumber: null, status: 'DRAFT', issueDate: null, dueDate: null, total: 9000, outstanding: 0 }),
      ]),
    })
  })
  await page.goto('/invoices')

  const summary = page.getByLabel('Summary')
  await expect(summary).toContainText('Outstanding')
  await expect(summary).toContainText('₹2,45,000.00')
  await expect(summary).toContainText('3 invoices unpaid')
  await expect(summary).toContainText('₹60,000.00')
  await expect(summary).toContainText('1 past the due date')

  await page.getByRole('combobox', { name: 'Status' }).selectOption('OVERDUE')
  const rows = page.getByRole('table').getByRole('row')
  await expect(rows.nth(2)).toContainText('INV-2627-000003')
  // The status is said in words, with how late; a draft has no number and owes nothing.
  await expect(rows.nth(2)).toContainText('Status: Overdue · 20 days')
  await expect(rows.nth(2)).toContainText('₹60,000.00')
  await expect(rows.nth(3)).toContainText('Status: Paid')
  await expect(rows.nth(4)).toContainText('Draft')
  await expect(rows.nth(4)).toContainText('—')
  await expect.poll(() => requests.at(-1)).toContain('status=OVERDUE')

  await expect(page.getByRole('link', { name: 'New invoice' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Invoices' })).toBeVisible()
})

// ------------------------------------------------------------------ preparing an invoice

test('a draft is prepared line by line, with totals worked out by the server', async ({ page }) => {
  await signIn(page, BOOKKEEPER)
  const previews: unknown[] = []
  await page.route('**/api/v1/invoices/preview', (route) => {
    const body = route.request().postDataJSON() as { items: { quantity: number; unitPrice: number; discountPercent: number; taxPercent: number }[] }
    previews.push(body)
    const lines = body.items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice
      const discountAmount = (lineSubtotal * item.discountPercent) / 100
      const taxAmount = ((lineSubtotal - discountAmount) * item.taxPercent) / 100
      return { lineSubtotal, discountAmount, taxAmount, lineTotal: lineSubtotal - discountAmount + taxAmount }
    })
    const sum = (key: 'lineSubtotal' | 'discountAmount' | 'taxAmount' | 'lineTotal') => lines.reduce((total, line) => total + line[key], 0)
    return route.fulfill({ json: { lines, subtotal: sum('lineSubtotal'), discountTotal: sum('discountAmount'), taxTotal: sum('taxAmount'), total: sum('lineTotal') } })
  })
  let created: Record<string, unknown> | null = null
  await page.route('**/api/v1/invoices', (route) => {
    created = route.request().postDataJSON() as Record<string, unknown>
    return route.fulfill({ status: 201, json: invoiceDetail(BOOKKEEPER, { invoice: invoiceSummary({ invoiceNumber: null, status: 'DRAFT', issueDate: null, dueDate: null, outstanding: 0 }), actions: actionsFor('DRAFT', BOOKKEEPER) }) })
  })
  await page.route(`**/api/v1/invoices/${INVOICE}`, (route) =>
    route.fulfill({ json: invoiceDetail(BOOKKEEPER, { invoice: invoiceSummary({ invoiceNumber: null, status: 'DRAFT', issueDate: null, dueDate: null, outstanding: 0 }), actions: actionsFor('DRAFT', BOOKKEEPER) }) }),
  )
  await page.goto('/invoices/new')
  const form = page.getByRole('form', { name: 'New invoice' })

  // Saving without a customer or a complete line is stopped in the browser.
  await form.getByRole('button', { name: 'Create draft' }).click()
  await expect(form.getByText('Say what is being billed')).toBeVisible()
  expect(created).toBeNull()

  await form.getByRole('searchbox', { name: 'Find a customer' }).fill('acme')
  await form.getByRole('button', { name: /Acme Solar/ }).click()
  await expect(form.getByText('Change customer')).toBeVisible()

  const first = form.getByRole('listitem', { name: 'Line 1' })
  await first.getByRole('textbox', { name: 'Description' }).fill('Dome camera, installed')
  await first.getByRole('textbox', { name: 'Quantity' }).fill('8')
  await first.getByRole('textbox', { name: 'Unit price (₹)' }).fill('12500')
  await first.getByRole('textbox', { name: 'Discount %' }).fill('10')
  // The tax rate starts at the configured default.
  await expect(first.getByRole('textbox', { name: 'Tax %' })).toHaveValue('18')
  await expect(first).toContainText('₹1,06,200.00')

  await form.getByRole('button', { name: 'Add line' }).click()
  const second = form.getByRole('listitem', { name: 'Line 2' })
  await second.getByRole('textbox', { name: 'Description' }).fill('Site survey')
  await second.getByRole('textbox', { name: 'Unit price (₹)' }).fill('500')
  await second.getByRole('textbox', { name: 'Tax %' }).fill('0')

  const totals = form.getByLabel('Totals')
  await expect(totals).toContainText('₹1,00,500.00')
  await expect(totals).toContainText('− ₹10,000.00')
  await expect(totals).toContainText('₹16,200.00')
  await expect(totals).toContainText('₹1,06,700.00')

  // A value that is not a number is caught before anything is sent.
  await second.getByRole('textbox', { name: 'Quantity' }).fill('two')
  await form.getByRole('button', { name: 'Create draft' }).click()
  await expect(second.getByText('Above zero, up to 3 decimals')).toBeVisible()
  expect(created).toBeNull()
  await second.getByRole('textbox', { name: 'Quantity' }).fill('1')

  await form.getByRole('textbox', { name: 'Their reference' }).fill('PO-7781')
  await form.getByRole('button', { name: 'Create draft' }).click()
  await expect(page).toHaveURL(`/invoices/${INVOICE}`)
  expect(created).toEqual({
    customerId: CUSTOMER, billingAddress: null, customerTaxId: null, reference: 'PO-7781', paymentTermsDays: 15, notes: null, terms: null,
    items: [
      { description: 'Dome camera, installed', hsnSac: null, quantity: 8, unit: null, unitPrice: 12500, discountPercent: 10, taxPercent: 18 },
      { description: 'Site survey', hsnSac: null, quantity: 1, unit: null, unitPrice: 500, discountPercent: 0, taxPercent: 0 },
    ],
  })
  expect(previews.length).toBeGreaterThan(0)
})

test('a draft is issued with its dates, and from then on is corrected rather than changed', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const log: Call[] = []
  const state = invoiceDetail(ACCOUNTANT, {
    invoice: invoiceSummary({ invoiceNumber: null, status: 'DRAFT', issueDate: null, dueDate: null, outstanding: 0 }),
    issuedAt: null, issuedByName: null, actions: actionsFor('DRAFT', ACCOUNTANT),
  })
  await mockInvoice(page, state, ACCOUNTANT, log)
  await page.goto(`/invoices/${INVOICE}`)

  await expect(page.getByRole('heading', { name: 'Draft invoice' })).toBeVisible()
  await expect(page.getByText('Draft: no number')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible()
  // A draft is not owed, cannot be paid and has no document to print.
  await expect(page.getByRole('link', { name: 'Record payment' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Print' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Issue invoice' }).click()
  const issue = page.getByRole('form', { name: 'Issue invoice' })
  await expect(issue).toContainText('makes ₹1,18,000.00 owed')
  // Today, and due after the invoice's payment terms; the due date follows the issue date.
  await expect(issue.getByLabel('Issue date')).toHaveValue('2026-10-10')
  await expect(issue.getByLabel('Due date')).toHaveValue('2026-10-25')
  await issue.getByLabel('Issue date').fill('2026-10-01')
  await expect(issue.getByLabel('Due date')).toHaveValue('2026-10-16')
  await issue.getByLabel('Due date').fill('2026-09-30')
  await expect(issue.getByRole('alert')).toHaveText('Due date cannot be before issue date.')
  await expect(issue.getByRole('button', { name: 'Issue invoice' })).toBeDisabled()
  await issue.getByLabel('Due date').fill('2026-10-31')
  await issue.getByRole('button', { name: 'Issue invoice' }).click()

  await expect(page.getByRole('heading', { name: 'INV-2627-000008' })).toBeVisible()
  expect(log.at(-1)).toMatchObject({ method: 'POST', path: 'issue', body: { issueDate: '2026-10-01', dueDate: '2026-10-31' } })
  await expect(page.getByText('Status: Issued')).toBeVisible()
  // Issued: no editing any more. What is offered instead is payment, notes and cancellation.
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Discard draft' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Record payment' })).toHaveAttribute('href', `/payments/new?customerId=${CUSTOMER}&invoiceId=${INVOICE}`)
  await expect(page.getByRole('link', { name: 'Print' })).toBeVisible()
  await expect(page.getByLabel('Totals')).toContainText('Outstanding')
})

test('credit and debit notes change what is owed, each with a reason and an idempotency key', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const log: Call[] = []
  await mockInvoice(page, invoiceDetail(ACCOUNTANT), ACCOUNTANT, log)
  await page.goto(`/invoices/${INVOICE}`)

  await page.getByRole('button', { name: 'Credit note' }).click()
  const credit = page.getByRole('form', { name: 'Credit note' })
  await expect(credit).toContainText('At most ₹1,18,000.00, which is what is outstanding.')
  await credit.getByRole('button', { name: 'Record credit note' }).click()
  await expect(credit.getByRole('alert')).toHaveText('Enter an amount above zero, up to 2 decimals.')
  await credit.getByLabel('Amount (₹)').fill('12500')
  await credit.getByRole('button', { name: 'Record credit note' }).click()
  await expect(credit.getByRole('alert')).toHaveText('Give a reason; it is kept with the note.')
  expect(log).toHaveLength(0)

  // The server refuses more than is owed, and says what to do instead.
  await credit.getByLabel('Amount (₹)').fill('200000')
  await credit.getByLabel('Reason').fill('One camera returned')
  await credit.getByRole('button', { name: 'Record credit note' }).click()
  await expect(page.getByText('has only ₹1,18,000 outstanding')).toBeVisible()
  const refusedKey = log.at(-1)?.key
  expect(refusedKey).toMatch(/^[0-9a-f-]{36}$/)

  await credit.getByLabel('Amount (₹)').fill('12500')
  await credit.getByRole('button', { name: 'Record credit note' }).click()
  const notes = page.getByRole('region', { name: 'Credit notes' })
  await expect(notes).toContainText('CRN-2627-000001')
  await expect(notes).toContainText('One camera returned')
  await expect(notes).toContainText('− ₹12,500.00')
  expect(log.at(-1)).toMatchObject({ path: 'credit-notes', body: { amount: 12500, reason: 'One camera returned' } })
  // The refused attempt recorded nothing, so the corrected one is a new request with a new key.
  expect(log.at(-1)?.key).toMatch(/^[0-9a-f-]{36}$/)
  expect(log.at(-1)?.key).not.toBe(refusedKey)
  await expect(page.getByLabel('Totals')).toContainText('₹1,05,500.00')
  // With a note against it the invoice can no longer simply be cancelled.
  await expect(page.getByRole('button', { name: 'Cancel invoice' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Debit note' }).click()
  const debit = page.getByRole('form', { name: 'Debit note' })
  await debit.getByLabel('Amount (₹)').fill('2500.50')
  await debit.getByLabel('Reason').fill('Extra cabling')
  await debit.getByRole('button', { name: 'Record debit note' }).click()
  await expect(page.getByRole('region', { name: 'Debit notes' })).toContainText('+ ₹2,500.50')
  await expect(page.getByLabel('Totals')).toContainText('₹1,08,000.50')
})

test('an untouched invoice is cancelled with a reason and stays on record', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const log: Call[] = []
  await mockInvoice(page, invoiceDetail(ACCOUNTANT), ACCOUNTANT, log)
  await page.goto(`/invoices/${INVOICE}`)

  await page.getByRole('button', { name: 'Cancel invoice' }).click()
  const cancel = page.getByRole('form', { name: 'Cancel invoice' })
  await expect(cancel).toContainText('keeps its number and stays on record')
  await cancel.getByRole('button', { name: 'Cancel this invoice' }).click()
  await expect(cancel.getByRole('alert')).toHaveText('Give a reason; it is kept on record.')
  await cancel.getByLabel('Reason').fill('Raised twice')
  await cancel.getByRole('button', { name: 'Cancel this invoice' }).click()

  await expect(page.getByText('Status: Cancelled')).toBeVisible()
  await expect(page.getByText('Cancelled on 10 Oct 2026: Raised twice')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'INV-2627-000007' })).toBeVisible()
  expect(log.at(-1)).toMatchObject({ path: 'cancel', body: { reason: 'Raised twice' } })
  await expect(page.getByRole('link', { name: 'Record payment' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Actions' })).toHaveCount(0)
})

test('someone who may only view finance reads an invoice and changes nothing', async ({ page }) => {
  await signIn(page, VIEW)
  await mockInvoice(page, invoiceDetail(VIEW), VIEW)
  await page.goto(`/invoices/${INVOICE}`)

  await expect(page.getByRole('heading', { name: 'INV-2627-000007' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lines' })).toContainText('Dome camera, installed')
  await expect(page.getByRole('region', { name: 'Actions' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Record payment' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)

  await page.goto('/invoices/new')
  await expect(page.getByRole('form', { name: 'New invoice' })).toHaveCount(0)
})

test('the printed invoice is one sheet with the company, the customer and what is due', async ({ page }) => {
  await signIn(page, VIEW)
  await mockInvoice(page, invoiceDetail(VIEW, { invoice: invoiceSummary({ status: 'PARTIALLY_PAID', amountPaid: 30000, outstanding: 88000 }) }), VIEW)
  await page.goto(`/invoices/${INVOICE}/print`)

  const sheet = page.getByRole('article')
  await expect(sheet.getByRole('heading', { name: 'Tax invoice' })).toBeVisible()
  await expect(sheet).toContainText('Pawan Putra Pvt Ltd')
  await expect(sheet).toContainText('GSTIN 09AAACP9999P1Z1')
  await expect(sheet).toContainText('INV-2627-000007')
  await expect(sheet).toContainText('Acme Solar')
  await expect(sheet).toContainText('12 MG Road')
  await expect(sheet).toContainText('1 Oct 2026')
  await expect(sheet).toContainText('16 Oct 2026')
  await expect(sheet).toContainText('PO-7781')
  await expect(sheet).toContainText('HSN/SAC 8525')
  await expect(sheet).toContainText('₹1,18,000.00')
  await expect(sheet).toContainText('− ₹30,000.00')
  await expect(sheet).toContainText('Balance due')
  await expect(sheet).toContainText('₹88,000.00')
  // Nothing of the application is on the page that prints.
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible()
})

// ------------------------------------------------------------------ payments

test('a payment is recorded against what the customer owes, oldest first, exactly once', async ({ page }) => {
  await signIn(page, BOOKKEEPER)
  await page.route(`**/api/v1/customers/${CUSTOMER}`, (route) =>
    route.fulfill({
      json: { id: CUSTOMER, customerNumber: 'CUS-000042', type: 'BUSINESS', displayName: 'Acme Solar', email: null, phone: '9876543210',
        status: 'ACTIVE', source: null, assignedTo: null, tags: [], createdAt: '2026-01-01T00:00:00Z', firstName: null, lastName: null,
        companyName: 'Acme Solar', taxId: null, contactCount: 0, addressCount: 0, version: 0, updatedAt: '2026-01-01T00:00:00Z' },
    }),
  )
  await page.route('**/api/v1/invoices/open?*', (route) =>
    route.fulfill({
      json: [
        invoiceSummary({ id: 'old', invoiceNumber: 'INV-2627-000003', status: 'OVERDUE', dueDate: '2026-09-20', total: 60000, outstanding: 60000, daysOverdue: 20 }),
        invoiceSummary(),
      ],
    }),
  )
  const calls: Call[] = []
  let fail = true
  await page.route('**/api/v1/payments', (route) => {
    const request = route.request()
    calls.push({ method: request.method(), path: '', body: request.postDataJSON(), key: request.headers()['idempotency-key'] })
    if (fail) {
      fail = false
      // The connection drops: the browser cannot know whether the payment was recorded.
      return route.abort('connectionfailed')
    }
    return route.fulfill({ status: 201, json: paymentDetail({ payment: paymentSummary({ amount: 100000, allocated: 100000, unallocated: 0 }) }) })
  })
  await page.route(`**/api/v1/payments/${PAYMENT}`, (route) => route.fulfill({ json: paymentDetail() }))
  // Arriving from the invoice: its customer, and its outstanding amount against it.
  await page.goto(`/payments/new?customerId=${CUSTOMER}&invoiceId=${INVOICE}`)
  const form = page.getByRole('form', { name: 'Record payment' })

  await expect(form.getByText('Change customer')).toBeVisible()
  await expect(form.getByLabel('Amount received (₹)')).toHaveValue('118000.00')
  await expect(form.getByLabel('Received on')).toHaveValue('2026-10-10')
  await expect(form.getByRole('textbox', { name: 'Amount for INV-2627-000007' })).toHaveValue('118000.00')
  const settles = form.getByRole('region', { name: 'Settles' })
  await expect(settles).toContainText('Status: Overdue · 20 days')

  // A lakh arrives instead: the older invoice is settled first, and the rest goes to the newer one.
  await form.getByLabel('Amount received (₹)').fill('100000')
  await expect(settles.getByRole('alert')).toHaveText('Allocations exceed the amount available.')
  await settles.getByRole('button', { name: 'Settle oldest first' }).click()
  await expect(form.getByRole('textbox', { name: 'Amount for INV-2627-000003' })).toHaveValue('60000.00')
  await expect(form.getByRole('textbox', { name: 'Amount for INV-2627-000007' })).toHaveValue('40000.00')
  await expect(settles).toContainText('₹1,00,000.00 allocated')
  await expect(settles).toContainText('₹0.00 left unallocated')

  // UPI needs its reference.
  await form.getByLabel('Method').selectOption(UPI)
  await form.getByRole('button', { name: 'Record payment' }).click()
  await expect(form.getByText('A reference is required for UPI')).toBeVisible()
  expect(calls).toHaveLength(0)
  await form.getByLabel('Reference').fill('UTR 4411')

  // The first attempt is lost on the way. Trying again sends the same key, so it cannot record twice.
  await form.getByRole('button', { name: 'Record payment' }).click()
  await expect(form.getByRole('alert')).toContainText('Could not reach the server')
  await form.getByRole('button', { name: 'Record payment' }).click()
  await expect(page).toHaveURL(`/payments/${PAYMENT}`)

  expect(calls).toHaveLength(2)
  expect(calls[0].key).toMatch(/^[0-9a-f-]{36}$/)
  expect(calls[1].key).toBe(calls[0].key)
  expect(calls[1].body).toEqual({
    customerId: CUSTOMER, amount: 100000, receivedOn: '2026-10-10', methodId: UPI, reference: 'UTR 4411', notes: null,
    allocations: [{ invoiceId: 'old', amount: 60000 }, { invoiceId: INVOICE, amount: 40000 }],
  })
})

/** A stand-in for the server that keeps one payment and applies each request to it. */
async function mockPayment(page: Page, state: PaymentState, log: Call[] = []) {
  const refresh = () => {
    const allocated = state.allocations.filter((allocation) => !allocation.released).reduce((sum, allocation) => sum + allocation.amount, 0)
    const refunded = state.refunds.reduce((sum, refund) => sum + (refund.amount as number), 0)
    const reversed = state.payment.status === 'REVERSED'
    const unallocated = reversed ? 0 : state.payment.amount - allocated - refunded
    state.payment = { ...state.payment, allocated, refunded, unallocated }
    state.actions = { allocate: !reversed && unallocated > 0, release: !reversed && allocated > 0, refund: !reversed && unallocated > 0, reverse: !reversed && refunded === 0 }
  }
  refresh()
  const reply = (route: Route, status = 200) => route.fulfill({ status, json: state })
  await page.route(`**/api/v1/payments/${PAYMENT}`, (route) => reply(route))
  await page.route(`**/api/v1/payments/${PAYMENT}/**`, (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.split(`${PAYMENT}/`)[1]
    const body = request.postDataJSON() as Record<string, unknown>
    log.push({ method: request.method(), path, body, key: request.headers()['idempotency-key'] })
    if (path.endsWith('/release')) {
      const allocation = state.allocations.find((candidate) => candidate.id === path.split('/')[1])
      if (allocation) {
        allocation.released = true
        allocation.releaseReason = body.reason as string
      }
    } else if (path === 'refunds') {
      state.refunds = [...state.refunds, { id: 'r1', refundNumber: 'RFD-2627-000001', refundDate: '2026-10-10', amount: body.amount, methodName: 'Cash', reference: body.reference ?? null, reason: body.reason, refundedByName: 'Asha Verma', createdAt: '2026-10-10T09:00:00Z' }]
    } else if (path === 'allocations') {
      const added = (body.allocations as { invoiceId: string; amount: number }[]).map((allocation, index) => ({
        id: `n${index}`, invoiceId: allocation.invoiceId, invoiceNumber: 'INV-2627-000003', amount: allocation.amount, released: false,
        releaseReason: null as string | null, allocatedByName: 'Asha Verma', allocatedAt: '2026-10-10T10:00:00Z',
      }))
      state.allocations = [...state.allocations, ...added]
    } else if (path === 'reverse') {
      state.allocations.forEach((allocation) => {
        if (!allocation.released) {
          allocation.released = true
          allocation.releaseReason = `Payment reversed: ${body.reason as string}`
        }
      })
      state.payment = { ...state.payment, status: 'REVERSED' }
      state.reversedAt = '2026-10-10T11:00:00Z'
      state.reversedByName = 'Asha Verma'
      state.reversalReason = body.reason as string
    }
    refresh()
    return reply(route, path === 'refunds' || path === 'allocations' ? 201 : 200)
  })
}

test('a payment is put right by releasing, allocating and refunding, never by editing', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const log: Call[] = []
  await mockPayment(page, paymentDetail(), log)
  await page.route('**/api/v1/invoices/open?*', (route) =>
    route.fulfill({ json: [invoiceSummary({ id: 'old', invoiceNumber: 'INV-2627-000003', status: 'OVERDUE', dueDate: '2026-09-20', total: 60000, outstanding: 60000, daysOverdue: 20 })] }),
  )
  await page.goto(`/payments/${PAYMENT}`)

  await expect(page.getByRole('heading', { name: 'RCT-2627-000004' })).toBeVisible()
  const amounts = page.getByLabel('Amounts')
  await expect(amounts).toContainText('₹50,000.00')
  await expect(amounts).toContainText('− ₹30,000.00')
  await expect(amounts).toContainText('₹20,000.00')
  // There is nothing to edit or delete on a payment.
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0)

  // The allocation went to the wrong invoice: release it, saying why.
  const allocated = page.getByRole('region', { name: 'Allocated to' })
  await allocated.getByRole('button', { name: 'Release ₹30,000.00 from INV-2627-000007' }).click()
  const release = page.getByRole('form', { name: 'Release allocation' })
  await expect(release).toContainText('INV-2627-000007 will be owed ₹30,000.00 again')
  await release.getByLabel('Reason').fill('Wrong invoice')
  await release.getByRole('button', { name: 'Release' }).click()
  await expect(allocated).toContainText('Released: Wrong invoice')
  await expect(amounts).toContainText('₹50,000.00')
  expect(log.at(-1)).toMatchObject({ path: 'allocations/a1/release', body: { reason: 'Wrong invoice' } })

  // Put part of it against the right invoice instead.
  await allocated.getByRole('button', { name: 'Allocate to invoices' }).click()
  const allocate = page.getByRole('form', { name: 'Allocate to invoices' })
  await allocate.getByRole('textbox', { name: 'Amount for INV-2627-000003' }).fill('70000')
  await expect(allocate.getByText('More than this invoice is owed')).toBeVisible()
  await expect(allocate.getByRole('button', { name: 'Allocate', exact: true })).toBeDisabled()
  await allocate.getByRole('textbox', { name: 'Amount for INV-2627-000003' }).fill('35000')
  await expect(allocate).toContainText('₹15,000.00 left unallocated')
  await allocate.getByRole('button', { name: 'Allocate', exact: true }).click()
  await expect(amounts).toContainText('− ₹35,000.00')
  expect(log.at(-1)).toMatchObject({ path: 'allocations', body: { allocations: [{ invoiceId: 'old', amount: 35000 }] } })
  expect(log.at(-1)?.key).toMatch(/^[0-9a-f-]{36}$/)

  // Return the rest to the customer: no more than is unallocated.
  const refunds = page.getByRole('region', { name: 'Refunds' })
  await refunds.getByRole('button', { name: 'Refund' }).click()
  const refund = page.getByRole('form', { name: 'Refund' })
  await expect(refund.getByLabel('Amount (₹)')).toHaveValue('15000.00')
  await refund.getByLabel('Amount (₹)').fill('16000')
  await refund.getByLabel('Returned by').selectOption(CASH)
  await refund.getByLabel('Reason').fill('Overpaid')
  await refund.getByRole('button', { name: 'Record refund' }).click()
  await expect(refund.getByRole('alert')).toContainText('Only ₹15,000.00 is unallocated')
  await refund.getByLabel('Amount (₹)').fill('15000')
  await refund.getByRole('button', { name: 'Record refund' }).click()
  await expect(refunds).toContainText('RFD-2627-000001')
  await expect(refunds).toContainText('Overpaid')
  expect(log.at(-1)).toMatchObject({ path: 'refunds', body: { amount: 15000, methodId: CASH, reference: null, reason: 'Overpaid' } })
  // Once part of it has been refunded, the payment can no longer be reversed.
  await expect(page.getByRole('button', { name: 'Reverse payment' })).toHaveCount(0)
})

test('a bounced payment is reversed with a reason and kept on record', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const log: Call[] = []
  await mockPayment(page, paymentDetail(), log)
  await page.goto(`/payments/${PAYMENT}`)

  await page.getByRole('button', { name: 'Reverse payment' }).click()
  const reverse = page.getByRole('form', { name: 'Reverse payment' })
  await expect(reverse).toContainText('Every invoice this payment settled becomes owed again')
  await reverse.getByRole('button', { name: 'Reverse this payment' }).click()
  await expect(reverse.getByRole('alert')).toHaveText('Give a reason; it is kept on record.')
  await reverse.getByLabel('Reason').fill('Cheque bounced')
  await reverse.getByRole('button', { name: 'Reverse this payment' }).click()

  await expect(page.getByText('Status: Reversed')).toBeVisible()
  await expect(page.getByText(/Reversed on 10 Oct 2026 by Asha Verma: Cheque bounced/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Allocated to' })).toContainText('Released: Payment reversed: Cheque bounced')
  await expect(page.getByRole('heading', { name: 'RCT-2627-000004' })).toBeVisible()
  expect(log.at(-1)).toMatchObject({ path: 'reverse', body: { reason: 'Cheque bounced' } })
  // Nothing more can be done with it.
  await expect(page.getByRole('button', { name: 'Reverse payment' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Refund' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Allocate to invoices' })).toHaveCount(0)
})

test('a bookkeeper records and allocates but cannot release, refund or reverse', async ({ page }) => {
  await signIn(page, BOOKKEEPER)
  await page.route(`**/api/v1/payments/${PAYMENT}`, (route) =>
    route.fulfill({ json: paymentDetail({ actions: { allocate: true, release: false, refund: false, reverse: false } }) }),
  )
  await page.goto(`/payments/${PAYMENT}`)

  await expect(page.getByRole('button', { name: 'Allocate to invoices' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Release/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Refunds' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Reverse' })).toHaveCount(0)
})

// ------------------------------------------------------------------ ageing

test('the ageing report shows what each customer owes by how long it has been due', async ({ page }) => {
  await signIn(page, VIEW)
  await page.route('**/api/v1/finance/ageing', (route) =>
    route.fulfill({
      json: {
        asOf: '2026-10-10',
        buckets: [
          { label: 'Not due', fromDays: null, toDays: 0 }, { label: '1-30 days', fromDays: 1, toDays: 30 },
          { label: '31-60 days', fromDays: 31, toDays: 60 }, { label: '61-90 days', fromDays: 61, toDays: 90 },
          { label: 'Over 90 days', fromDays: 91, toDays: null },
        ],
        totals: [118000, 60000, 0, 0, 67000], total: 245000, overdue: 127000,
        customers: [
          { customerId: CUSTOMER, customerName: 'Acme Solar', amounts: [118000, 60000, 0, 0, 0], total: 178000, oldestDaysOverdue: 20, invoices: 2 },
          { customerId: 'c2', customerName: 'Bright Interiors', amounts: [0, 0, 0, 0, 67000], total: 67000, oldestDaysOverdue: 131, invoices: 1 },
        ],
      },
    }),
  )
  await page.goto('/finance/ageing')

  await expect(page.getByText('What customers owe as of 10 Oct 2026')).toBeVisible()
  const summary = page.getByLabel('Summary')
  await expect(summary).toContainText('₹2,45,000.00')
  await expect(summary).toContainText('2 customers owe')
  await expect(summary).toContainText('₹1,27,000.00')

  // Every band is written out with its amount; the bar only repeats them.
  const byAge = page.getByRole('region', { name: 'By age' })
  for (const [band, amount] of [['Not due', '₹1,18,000.00'], ['1-30 days', '₹60,000.00'], ['31-60 days', '₹0.00'], ['Over 90 days', '₹67,000.00']]) {
    await expect(byAge.getByText(band, { exact: true })).toBeVisible()
    await expect(byAge).toContainText(amount)
  }

  const table = page.getByRole('table', { name: 'What each customer owes, by age' })
  await expect(table.getByRole('columnheader')).toHaveText(['Customer', 'Not due', '1-30 days', '31-60 days', '61-90 days', 'Over 90 days', 'Total'])
  const acme = table.getByRole('row', { name: /Acme Solar/ })
  await expect(acme).toContainText('2 invoices · oldest 20 days overdue')
  await expect(acme.getByRole('cell')).toHaveText(['₹1,18,000.00', '₹60,000.00', '—', '—', '—', '₹1,78,000.00'])
  await expect(table.getByRole('row', { name: /Bright Interiors/ })).toContainText('oldest 131 days overdue')
  await expect(table.getByRole('row', { name: /^Total/ }).getByRole('cell').last()).toHaveText('₹2,45,000.00')
  // A customer's name leads to what they owe.
  await expect(acme.getByRole('link', { name: 'Acme Solar' })).toHaveAttribute('href', `/invoices?customerId=${CUSTOMER}&outstanding=true`)
})

// ------------------------------------------------------------------ payment methods

test('payment methods are added, switched off and removed by whoever configures finance', async ({ page }) => {
  await signIn(page, ACCOUNTANT)
  const methods = METHODS.map((method) => ({ ...method }))
  const log: { method: string; body: unknown }[] = []
  await page.unroute('**/api/v1/payment-methods*')
  await page.route('**/api/v1/payment-methods**', (route) => {
    const request = route.request()
    const id = new URL(request.url()).pathname.split('/payment-methods/')[1]
    if (request.method() === 'GET') {
      return route.fulfill({ json: methods })
    }
    if (request.method() === 'DELETE') {
      log.push({ method: 'DELETE', body: id })
      methods.splice(methods.findIndex((method) => method.id === id), 1)
      return route.fulfill({ status: 204 })
    }
    const body = request.postDataJSON() as Record<string, unknown>
    log.push({ method: request.method(), body })
    if (request.method() === 'POST') {
      if (methods.some((method) => method.code === body.code)) {
        return route.fulfill({ status: 400, contentType: 'application/problem+json', json: { status: 400, code: 'VALIDATION_FAILED', detail: 'One or more values are invalid', errors: [{ field: 'code', message: 'Another payment method already has this code' }] } })
      }
      const created = { id: 'new', version: 0, ...(body as { code: string; name: string; requiresReference: boolean; active: boolean; displayOrder: number }) }
      methods.push(created)
      return route.fulfill({ status: 201, json: created })
    }
    const existing = methods.find((method) => method.id === id)!
    Object.assign(existing, body, { version: existing.version + 1 })
    return route.fulfill({ json: existing })
  })
  page.on('dialog', (dialog) => void dialog.accept())
  await page.goto('/admin/payment-methods')

  const list = page.getByRole('list', { name: 'Payment methods' })
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(list).toContainText('UPI · needs a reference')

  await page.getByRole('button', { name: 'New method' }).click()
  const form = page.getByRole('form', { name: 'New payment method' })
  await form.getByLabel('Name').fill('Cash on delivery')
  // The code is shaped as it is typed, and the server has the last word on it.
  await form.getByLabel('Code').fill('cash')
  await expect(form.getByLabel('Code')).toHaveValue('CASH')
  await form.getByRole('button', { name: 'Add method' }).click()
  await expect(form.getByRole('alert')).toHaveText('Another payment method already has this code')
  await form.getByLabel('Code').fill('cod')
  await form.getByRole('checkbox', { name: /A reference/ }).check()
  await form.getByRole('button', { name: 'Add method' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(3)
  await expect(list).toContainText('COD · needs a reference')
  expect(log.at(-1)).toEqual({ method: 'POST', body: { code: 'COD', name: 'Cash on delivery', requiresReference: true, active: true, displayOrder: 3 } })

  await list.getByRole('button', { name: 'Edit UPI' }).click()
  const edit = page.getByRole('form', { name: 'Edit UPI' })
  await expect(edit.getByLabel('Code')).toBeDisabled()
  await edit.getByRole('checkbox', { name: 'Offered when recording a payment' }).uncheck()
  await edit.getByRole('button', { name: 'Save method' }).click()
  await expect(list).toContainText('UPI · needs a reference · switched off')
  expect(log.at(-1)).toMatchObject({ method: 'PUT', body: { code: 'UPI', active: false, version: 0 } })

  await list.getByRole('button', { name: 'Remove Cash', exact: true }).click()
  await expect(list.getByRole('listitem')).toHaveCount(2)
  expect(log.at(-1)).toEqual({ method: 'DELETE', body: CASH })
})

test('payment methods can be read but not changed without the permission to configure', async ({ page }) => {
  await signIn(page, VIEW)
  await page.goto('/admin/payment-methods')

  await expect(page.getByRole('list', { name: 'Payment methods' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'New method' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Edit/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
})

// ------------------------------------------------------------------ who sees finance

test('finance is hidden from users without the permission', async ({ page }) => {
  await signIn(page, ['CUSTOMER_VIEW'])
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Main' })
  await expect(navigation.getByRole('link', { name: 'Customers' })).toBeVisible()
  for (const entry of ['Invoices', 'Payments', 'Ageing', 'Payment methods']) {
    await expect(navigation.getByRole('link', { name: entry })).toHaveCount(0)
  }
  for (const path of ['/invoices', '/payments', '/finance/ageing', `/invoices/${INVOICE}/print`]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible()
  }
})
