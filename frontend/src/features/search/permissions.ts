import { useAuth } from '@/features/auth/auth-context'
import type { EntityType } from '@/features/search/api'

/**
 * The permission that lets a person see each kind of record in search, the same rule the server applies: search
 * finds what you could open anyway. Someone with none of these (a vendor or partner account) has no search.
 */
export const SEARCH_PERMISSIONS: Record<EntityType, string> = {
  Customer: 'CUSTOMER_VIEW',
  Lead: 'LEAD_VIEW',
  Opportunity: 'OPPORTUNITY_VIEW',
  Quotation: 'QUOTATION_VIEW',
  Order: 'ORDER_VIEW',
  Project: 'PROJECT_VIEW',
  Ticket: 'TICKET_VIEW',
  Invoice: 'FINANCE_VIEW',
  Employee: 'WORKFORCE_VIEW',
  Vendor: 'VENDOR_VIEW',
}

export const ANY_SEARCH_PERMISSION: string[] = Object.values(SEARCH_PERMISSIONS)

export function useCanSearch(): boolean {
  const { user } = useAuth()
  return ANY_SEARCH_PERMISSION.some((permission) => user?.permissions.includes(permission))
}
