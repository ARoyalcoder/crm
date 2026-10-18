/**
 * Where a record of a given kind can be opened. Notifications, Pulse insights, activity feeds and the
 * dashboards all refer to records by type and id; this is the one place that knows the routes.
 * Returns `undefined` for a kind that has no page of its own (the caller then shows plain text).
 */
export function entityPath(entityType: string | null | undefined, entityId: string | null | undefined): string | undefined {
  if (!entityType) return undefined
  const type = entityType.toUpperCase().replace(/[\s_-]+/g, '')
  const id = entityId ?? ''
  switch (type) {
    case 'CUSTOMER':
      return id ? `/customers/${id}` : '/customers'
    case 'LEAD':
      return id ? `/leads/${id}` : '/leads'
    case 'OPPORTUNITY':
      return '/opportunities'
    case 'QUOTATION':
      return id ? `/quotations/${id}` : '/quotations'
    case 'ORDER':
      return id ? `/orders/${id}` : '/orders'
    case 'PROJECT':
      return id ? `/projects/${id}` : '/projects'
    case 'TICKET':
      return id ? `/support/tickets/${id}` : '/support/tickets'
    case 'INVOICE':
      return id ? `/invoices/${id}` : '/invoices'
    case 'PAYMENT':
      return id ? `/payments/${id}` : '/payments'
    case 'AMC':
    case 'AMCCONTRACT':
      return id ? `/amc-contracts/${id}` : '/amc-contracts'
    case 'WARRANTY':
      return '/warranties'
    case 'FIELDJOB':
    case 'JOB':
      return id ? `/field-jobs/${id}` : '/field-jobs'
    case 'EMPLOYEE':
      return id ? `/workforce/employees/${id}` : '/workforce/employees'
    case 'VENDOR':
      return id ? `/vendors/${id}` : '/vendors'
    case 'PARTNER':
      return '/partners'
    case 'DOCUMENT':
      return '/documents'
    case 'CANDIDATE':
      return id ? `/recruitment/candidates/${id}` : '/recruitment/candidates'
    case 'APPLICATION':
      return id ? `/recruitment/applications/${id}` : undefined
    case 'JOBOPENING':
      return id ? `/recruitment/jobs/${id}` : '/recruitment/jobs'
    case 'ACTIVITY':
    case 'TASK':
      return '/activities'
    case 'COLLECTIONTASK':
      return '/receivables/collection-tasks'
    default:
      return undefined
  }
}
