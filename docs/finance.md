# Finance core

What customers are billed, what they have paid, and what they still owe: invoices, payments and
their allocation, credit and debit notes, refunds, due dates and ageing.

Three promises hold throughout, and each is enforced in the database as well as in the code:

1. **Nothing is changed destructively.** A financial record is corrected by a new record, never
   by editing or deleting the old one.
2. **Money is never counted twice.** Everything that moves an amount runs in one database
   transaction with the rows it touches locked.
3. **A repeated request takes effect once.** A double click, a retry after a timeout or a gateway
   re-sending a webhook cannot record a second payment.

## The records

| Record | What it is | Number |
| --- | --- | --- |
| **Invoice** | What a customer is billed. A draft until issued | `INV-2627-000001` |
| **InvoiceItem** | One line: description, HSN/SAC, quantity, unit, unit price, discount %, tax % | |
| **Payment** | Money received from a customer, by a payment method, on a date | `RCT-2627-000001` |
| **PaymentAllocation** | How much of a payment settles which invoice | |
| **CreditNote** | Reduces what is owed on one invoice (a return, a price correction) | `CRN-2627-000001` |
| **DebitNote** | Adds to what is owed on one invoice (extra work, an under-billed quantity) | `DBN-2627-000001` |
| **Refund** | Money returned to the customer out of a payment | `RFD-2627-000001` |
| **PaymentMethod** | A way money arrives or is returned. Configured per organization | |

The customer's name, billing address and tax id are copied onto the invoice, so an issued invoice
keeps saying what it said even if the customer record changes.

## Invoices

### Status

```
DRAFT ──issue──▶ ISSUED ──payment──▶ PARTIALLY_PAID ──payment──▶ PAID
                    │                      (OVERDUE: either of these two, past the due date)
                    └──cancel──▶ CANCELLED
```

| Status | Meaning |
| --- | --- |
| `DRAFT` | Being prepared. No number. Can be edited or discarded. Nothing is owed |
| `ISSUED` | Has its number. Nothing paid yet |
| `PARTIALLY_PAID` | Some payment allocated, some still outstanding |
| `PAID` | Nothing outstanding: paid, credited, or both |
| `OVERDUE` | Money is still owing and the due date has passed |
| `CANCELLED` | Withdrawn after being issued. Keeps its number. Nothing is owed |

`OVERDUE` is **not stored**. It is `ISSUED` or `PARTIALLY_PAID` plus a due date before today,
worked out each time an invoice is read. An invoice therefore turns overdue at midnight with no job
having to run, and can never be shown with a stale status. Filtering by status works on the status
as shown: `status=OVERDUE` finds open invoices past due, `status=ISSUED` only those not yet past it.
An invoice due today is not overdue.

### Creation and generation

1. **Create** a draft: customer, lines, payment terms, reference, notes, terms. A billing address
   or tax id left empty is taken from the customer record. `POST /invoices/preview` returns what a
   set of lines adds up to without saving, which is what the form shows while it is being filled in.
2. **Issue** it: the invoice gets the next number of its fiscal year, an issue date (today unless
   given, never in the future) and a due date (the issue date plus the payment terms unless given).
   From then on it cannot be edited or deleted.
3. **Print** it: `/invoices/:id/print` is the invoice as one sheet, with the company's name,
   address and tax id at the head; the browser's print dialog saves it as a PDF.

### How an invoice adds up

For each line: `subtotal = quantity × unit price`, `discount = subtotal × discount %`,
`tax = (subtotal − discount) × tax %`, `total = subtotal − discount + tax`. Every amount is rounded
half up to paise on its own line, and the invoice totals are the sums of the lines, so the figures
can be checked with a calculator. The line amounts are stored, so an invoice adds up the same way
forever.

### What is owed

```
outstanding = total + debit notes − credit notes − payments allocated
```

- A **credit note** may not exceed what is outstanding. To credit an invoice that has been paid,
  first release that much of its payments; the money can then be refunded or used elsewhere.
- A **debit note** makes a paid invoice owing again.
- An invoice can be **cancelled** only while nothing has been settled against it (no payment, no
  note). After that, release its payments and credit what should not be owed.

## Payments

- **Recording** a payment and saying what it settles is one request and one transaction. Each
  allocation is checked: the invoice must be the same customer's, still owing, and owing at least
  that much; together they may not exceed the payment.
- Whatever is not allocated stays with the payment as an **advance** and can be allocated later.
- With `autoAllocate: true` the customer's invoices are settled **oldest due date first**, each in
  full before the next gets anything. (The screens fill the same amounts in for the user to see and
  change before saving.)
- A payment method can require a **reference** (cheque number, UTR); the payment is refused without it.

### Putting a payment right

| Mistake | What is done | What is left on record |
| --- | --- | --- |
| Allocated to the wrong invoice | The allocation is **released** | Both rows: the allocation and a second one that undoes it, with the reason |
| The customer overpaid | Unallocated money is **refunded** | The refund, numbered, with method and reason |
| The cheque bounced, or the payment was entered by mistake | The payment is **reversed**: every allocation is released | The payment, marked reversed, with who, when and why |

A payment that has been partly refunded cannot be reversed. There is no way to edit or delete a
payment.

## Due date and ageing

The due date is set when the invoice is issued and is part of the invoice from then on.

`GET /finance/ageing` reports what each customer owes as of today, in bands by days past the due
date: *Not due*, then `1-30`, `31-60`, `61-90` and `Over 90` (the bands are configuration). Customers
are listed largest debt first, with their oldest overdue invoice and a total per band.

`GET /finance/summary` gives the headline figures: outstanding, overdue, falling due in the next
seven days, unallocated payments, and what was invoiced and received this month.

Both are read from the invoices and payments at the moment of the request. Nothing is stored, so
the figures cannot drift from the records.

Overdue invoices also appear on the customer profile: as a health signal (`INVOICES_OVERDUE`, a
warning, or critical once the oldest is more than 60 days late) and, with every payment, on the
customer's timeline. Finance contributes these through `CustomerHealthContributor` and
`CustomerTimelineSource`; the customer module has no finance code.

## Nothing is changed destructively

| Record | In the application | In the database |
| --- | --- | --- |
| Draft invoice | Edited freely; discarded by a soft delete | Never deleted; lines free while a draft |
| Issued invoice | No edit or delete endpoint. Corrected by a note, or cancelled | A trigger refuses any change to its number, customer, dates, amounts, notes or terms, any return to draft, and any change at all once cancelled. Its lines are frozen with it |
| Payment | No edit or delete endpoint. Reversed | A trigger refuses any change to what was received (customer, date, amount, method, reference) and any change at all once reversed |
| Allocation, refund, credit note, debit note | Created, never touched again | Append-only: a trigger refuses every `UPDATE` and `DELETE` |

Check constraints add: an invoice is never settled beyond what is owed, a payment never allocated
or refunded beyond what was received, only a draft can be discarded, and a released allocation is
released once.

The running totals on an invoice (`amount_paid`, `credit_total`, `debit_total`) and on a payment
(`allocated_amount`, `refunded_amount`) are the only figures that move. They are sums of the
append-only rows, kept in step inside the same transaction; `FinanceIT` verifies they agree.

## Database transactions

- Every operation that moves money is one transaction: the record, the allocations, the running
  totals, the audit rows and the idempotency key commit together or not at all.
- Before an amount is read to decide anything, its row is **locked** (`SELECT ... FOR UPDATE`).
  Two payments arriving at once for the same invoice queue up; the second sees what the first left
  and is refused if nothing is owed any more.
- Locks are always taken in the same order (the payment, then invoices by id, then the number
  counter), so operations can wait for each other but not deadlock.
- **Numbers are gapless.** Each series (per organization, kind of document and fiscal year) is a
  row in `finance_document_sequences`, advanced inside the transaction that uses the number. A
  failed attempt rolls the counter back with everything else. A discarded draft never had a number.

## Idempotency

For the requests that move money, a client sends an `Idempotency-Key` header: a value it makes up
(a UUID) and sends again, unchanged, with every retry of that request.

| Request | Key scope |
| --- | --- |
| `POST /payments` | `payments.record` |
| `POST /payments/{id}/allocations` | `payments.allocate` |
| `POST /payments/{id}/refunds` | `payments.refund` |
| `POST /invoices/{id}/credit-notes` | `invoices.credit-note` |
| `POST /invoices/{id}/debit-notes` | `invoices.debit-note` |

- The first request with a key does the work and stores the key with what it created, **in the
  same transaction**. There is never a key without its result or a result without its key.
- A repeat with the same key and the same request returns the first result, with the response
  header `Idempotent-Replayed: true`, and records nothing.
- The same key with a **different** request is refused (`422`): that is a mistake, not a retry.
- Two copies arriving at the same moment: the second waits on the key row until the first finishes,
  then replays its result.
- Without the header every request stands for itself.

The screens make a key when a form opens and reuse it for every attempt to save, unless the server
answered the last attempt with an error (it recorded nothing, so a corrected attempt is a new
request).

### For payment gateways and webhooks

No gateway is connected. The door one will come in through exists and is tested:
`finance.api.PaymentIntake`.

```java
// In a future webhook controller, after verifying the gateway's signature:
Receipt receipt = paymentIntake.record(new GatewayPayment(
        organizationId, "razorpay", event.paymentId(), customerId, invoiceId,
        event.amount(), event.paidOn(), "UPI", event.paymentId()));
return ResponseEntity.ok().build();   // also for a duplicate: the gateway must stop retrying
```

- The gateway's own payment id is the idempotency key, in a scope of the gateway's own
  (`gateway:razorpay`). The first report records the payment; every repeat returns the same payment
  with `duplicate = true`.
- Beneath that, a unique index on `payments (organization_id, gateway, gateway_payment_id)` holds
  each gateway payment once, whatever the code does.
- A gateway payment never fails over the invoice: as much as the invoice can still take is
  allocated, and the rest waits unallocated.
- Other webhook events (a refund processed, a payment failed) use the same key table with the
  gateway's event id as the key.

What a gateway integration still has to bring: its webhook endpoint, signature verification, and
the mapping from its event to a `GatewayPayment`.

## Payment methods

Each organization has its own list (`/admin/payment-methods`): name, a code that never changes,
whether a reference is required, and whether it is offered. The first time an organization needs
payment methods it is given the standard ones from configuration (Cash, UPI, Bank transfer, Cheque,
Card), which it can then change or remove. A payment keeps the name its method had when it was taken.

## Who may do what

| Permission | Allows | Default roles |
| --- | --- | --- |
| `FINANCE_VIEW` | Seeing invoices, payments, ageing and payment methods | Super Admin, Admin, Director, Finance |
| `FINANCE_MANAGE` | Creating and issuing invoices; recording and allocating payments | Super Admin, Admin, Finance |
| `FINANCE_APPROVE` | Everything that takes money back off the books: credit and debit notes, refunds, cancelling an invoice, releasing an allocation, reversing a payment | Super Admin, Director, Finance |
| `FINANCE_CONFIGURE` | Defining the payment methods | Super Admin, Admin, Finance |

Another organization's invoice or payment is `404` for everyone. Every invoice and payment response
includes `actions`: what the caller may do with it as it stands, which is what the screens show.

Every financial record is written to the audit log by the audit module (`module = finance`):
creation, and each change to a running total or a status, with before and after values.

## API

All under `/api/v1`.

| Endpoint | Permission |
| --- | --- |
| `GET /invoices` (`search`, `status`, `customerId`, `outstanding`, `sort`, `page`, `size`); `GET /invoices/{id}`; `GET /invoices/open?customerId=` | `FINANCE_VIEW` |
| `POST /invoices`; `PUT /invoices/{id}` (with `version`); `DELETE /invoices/{id}` (drafts); `POST /invoices/preview`; `POST /invoices/{id}/issue` | `FINANCE_MANAGE` |
| `POST /invoices/{id}/cancel`; `POST /invoices/{id}/credit-notes`; `POST /invoices/{id}/debit-notes` | `FINANCE_APPROVE` |
| `GET /payments` (`search`, `status`, `customerId`, `unallocated`, `sort`, `page`, `size`); `GET /payments/{id}` | `FINANCE_VIEW` |
| `POST /payments`; `POST /payments/{id}/allocations` | `FINANCE_MANAGE` |
| `POST /payments/{id}/allocations/{allocationId}/release`; `POST /payments/{id}/refunds`; `POST /payments/{id}/reverse` | `FINANCE_APPROVE` |
| `GET /payment-methods` (`includeInactive`) | `FINANCE_VIEW` |
| `POST /payment-methods`; `PUT`, `DELETE /payment-methods/{id}` | `FINANCE_CONFIGURE` |
| `GET /finance/summary`; `GET /finance/ageing`; `GET /finance/settings` | `FINANCE_VIEW` |

## Screens

| Path | For |
| --- | --- |
| `/invoices` | Every invoice, with outstanding and overdue totals; filter by status or by what is owing |
| `/invoices/new`, `/invoices/:id/edit` | Preparing a draft, line by line, with live totals |
| `/invoices/:id` | One invoice: lines, totals, payments, notes; issue, credit, debit, cancel |
| `/invoices/:id/print` | The invoice as a document |
| `/payments`, `/payments/new`, `/payments/:id` | Receipts; recording one against what the customer owes; release, allocate, refund, reverse |
| `/finance/ageing` | The ageing report |
| `/admin/payment-methods` | The payment methods |
| Customer profile, *Financial summary* | What that customer owes, their latest invoices and payments |

## Configuration

`app.finance` in `application.yml`: the business time zone (`Asia/Kolkata`), the month the fiscal
year starts (April), the currency, the default payment terms (15 days) and tax rate (18%), the
ageing bands (30, 60, 90), the number prefixes, the default payment methods, and how late an invoice
must be to count as critical for a customer's health (60 days).

## Not built

- **Generating invoices from orders, quotations or project milestones.** An invoice is entered by
  hand; it carries the customer's reference as text but is not linked to an order or a project.
- **A payment gateway.** The idempotent intake exists; no gateway, webhook endpoint or signature
  check does.
- **GST detail.** One tax rate per line: no CGST/SGST/IGST split, place of supply, e-invoice or
  GST returns. Credit and debit notes are a single amount, not split into taxable value and tax.
- **A server-made PDF and emailing invoices.** The print page relies on the browser.
- Changing the due date of an issued invoice; part release of an allocation (release it and
  allocate again); recurring invoices; several currencies; late fees and interest; statements of
  account; ageing as of a past date; a general ledger; removing old idempotency keys.
