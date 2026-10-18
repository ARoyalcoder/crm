import type { ComponentType } from 'react'
import type { CustomerDetail } from '@/features/customers/api'
import { ActivitiesTab } from '@/features/customers/profile/ActivitiesTab'
import { BusinessInfoTab } from '@/features/customers/profile/BusinessInfoTab'
import { ContactsTab } from '@/features/customers/profile/ContactsTab'
import { SummaryTab } from '@/features/customers/profile/SummaryTab'
import { TimelineTab } from '@/features/customers/profile/TimelineTab'
import { CustomerProjectsTab } from '@/features/customers/profile/CustomerProjectsTab'
import { AmcWarrantyTab, DocumentsTab, SalesHistoryTab, ServiceHistoryTab } from '@/features/customers/profile/RelatedTabs'
import { CustomerFinanceTab } from '@/features/finance/components/CustomerFinanceTab'

export type CustomerTabProps = { customer: CustomerDetail }

export type CustomerTab = {
  /** Used in the URL: /customers/:id?tab=contacts */
  key: string
  label: string
  /** A number shown next to the label, when it is known. */
  count?: (customer: CustomerDetail) => number
  component: ComponentType<CustomerTabProps>
}

/**
 * The sections of the Customer 360, in order. (The header, with status and health, sits above them all.)
 *
 * Each section is a module plugging itself into the profile: it receives the customer and shows its own records. Their
 * events reach the Timeline section separately, through a CustomerTimelineSource on the backend.
 */
export const customerTabs: CustomerTab[] = [
  { key: 'summary', label: 'Summary', component: SummaryTab },
  { key: 'timeline', label: 'Timeline', component: TimelineTab },
  { key: 'business', label: 'Business info', component: BusinessInfoTab },
  { key: 'contacts', label: 'Contacts', count: (customer) => customer.contactCount, component: ContactsTab },
  { key: 'sales', label: 'Sales', component: SalesHistoryTab },
  { key: 'projects', label: 'Projects', component: CustomerProjectsTab },
  { key: 'financials', label: 'Finance', component: CustomerFinanceTab },
  { key: 'service', label: 'Service', component: ServiceHistoryTab },
  { key: 'amc', label: 'AMC & warranty', component: AmcWarrantyTab },
  { key: 'documents', label: 'Documents', component: DocumentsTab },
  { key: 'activities', label: 'Activities', component: ActivitiesTab },
]
