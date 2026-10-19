import { lazy, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
const AuditLogDetailPage = lazy(() => import('@/features/audit/pages/AuditLogDetailPage').then((m) => ({ default: m.AuditLogDetailPage })))
const AuditLogPage = lazy(() => import('@/features/audit/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { RequirePermission } from '@/features/auth/components/RequirePermission'
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const CategoriesPage = lazy(() => import('@/features/catalog/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })))
const CategoryFormPage = lazy(() => import('@/features/catalog/pages/CategoryFormPage').then((m) => ({ default: m.CategoryFormPage })))
const ServiceFieldsPage = lazy(() => import('@/features/catalog/pages/ServiceFieldsPage').then((m) => ({ default: m.ServiceFieldsPage })))
const ServiceFormPage = lazy(() => import('@/features/catalog/pages/ServiceFormPage').then((m) => ({ default: m.ServiceFormPage })))
const ServicesPage = lazy(() => import('@/features/catalog/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })))
const VerticalFormPage = lazy(() => import('@/features/catalog/pages/VerticalFormPage').then((m) => ({ default: m.VerticalFormPage })))
const VerticalsPage = lazy(() => import('@/features/catalog/pages/VerticalsPage').then((m) => ({ default: m.VerticalsPage })))
const BranchesPage = lazy(() => import('@/features/organization/pages/BranchesPage').then((m) => ({ default: m.BranchesPage })))
const BranchFormPage = lazy(() => import('@/features/organization/pages/BranchFormPage').then((m) => ({ default: m.BranchFormPage })))
import { RequireAnyPermission } from '@/features/auth/components/RequireAnyPermission'
const FieldJobFormPage = lazy(() => import('@/features/field-jobs/pages/FieldJobFormPage').then((m) => ({ default: m.FieldJobFormPage })))
const FieldJobPage = lazy(() => import('@/features/field-jobs/pages/FieldJobPage').then((m) => ({ default: m.FieldJobPage })))
const FieldJobsPage = lazy(() => import('@/features/field-jobs/pages/FieldJobsPage').then((m) => ({ default: m.FieldJobsPage })))
const MyJobsPage = lazy(() => import('@/features/field-jobs/pages/MyJobsPage').then((m) => ({ default: m.MyJobsPage })))
const AgeingPage = lazy(() => import('@/features/finance/pages/AgeingPage').then((m) => ({ default: m.AgeingPage })))
const InvoiceFormPage = lazy(() => import('@/features/finance/pages/InvoiceFormPage').then((m) => ({ default: m.InvoiceFormPage })))
const InvoicePage = lazy(() => import('@/features/finance/pages/InvoicePage').then((m) => ({ default: m.InvoicePage })))
const InvoicePrintPage = lazy(() => import('@/features/finance/pages/InvoicePrintPage').then((m) => ({ default: m.InvoicePrintPage })))
const InvoicesPage = lazy(() => import('@/features/finance/pages/InvoicesPage').then((m) => ({ default: m.InvoicesPage })))
const PaymentFormPage = lazy(() => import('@/features/finance/pages/PaymentFormPage').then((m) => ({ default: m.PaymentFormPage })))
const PaymentMethodsPage = lazy(() => import('@/features/finance/pages/PaymentMethodsPage').then((m) => ({ default: m.PaymentMethodsPage })))
const PaymentPage = lazy(() => import('@/features/finance/pages/PaymentPage').then((m) => ({ default: m.PaymentPage })))
const PaymentsPage = lazy(() => import('@/features/finance/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
const ProjectAnalyticsPage = lazy(() => import('@/features/project-analytics/pages/ProjectAnalyticsPage').then((m) => ({ default: m.ProjectAnalyticsPage })))
const ProjectTemplateFormPage = lazy(() => import('@/features/project-templates/pages/ProjectTemplateFormPage').then((m) => ({ default: m.ProjectTemplateFormPage })))
const ProjectTemplatePage = lazy(() => import('@/features/project-templates/pages/ProjectTemplatePage').then((m) => ({ default: m.ProjectTemplatePage })))
const ProjectTemplatesPage = lazy(() => import('@/features/project-templates/pages/ProjectTemplatesPage').then((m) => ({ default: m.ProjectTemplatesPage })))
const LeadDetailPage = lazy(() => import('@/features/leads/pages/LeadDetailPage').then((m) => ({ default: m.LeadDetailPage })))
const LeadFormPage = lazy(() => import('@/features/leads/pages/LeadFormPage').then((m) => ({ default: m.LeadFormPage })))
const LeadsPage = lazy(() => import('@/features/leads/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })))
const QualificationQuestionsPage = lazy(() => import('@/features/leads/pages/QualificationQuestionsPage').then((m) => ({ default: m.QualificationQuestionsPage })))
const ActivitiesPage = lazy(() => import('@/features/activities/pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })))
const OpportunitiesPage = lazy(() => import('@/features/opportunities/pages/OpportunitiesPage').then((m) => ({ default: m.OpportunitiesPage })))
const QuotationsPage = lazy(() => import('@/features/quotations/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })))
const QuotationDetailPage = lazy(() => import('@/features/quotations/pages/QuotationDetailPage').then((m) => ({ default: m.QuotationDetailPage })))
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const OrderDetailPage = lazy(() => import('@/features/orders/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })))
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const CustomerFormPage = lazy(() => import('@/features/customers/pages/CustomerFormPage').then((m) => ({ default: m.CustomerFormPage })))
const CustomerProfilePage = lazy(() => import('@/features/customers/pages/CustomerProfilePage').then((m) => ({ default: m.CustomerProfilePage })))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })))
const HomePage = lazy(() => import('@/features/analytics/pages/HomePage').then((m) => ({ default: m.HomePage })))
const MyWorkPage = lazy(() => import('@/features/analytics/pages/MyWorkPage').then((m) => ({ default: m.MyWorkPage })))
import { ANY_SEARCH_PERMISSION } from '@/features/search/permissions'
import { NotFoundPage } from '@/pages/NotFoundPage'

const AmcDashboardPage = lazy(() => import('@/features/service-contracts/pages/AmcDashboardPage').then((m) => ({ default: m.AmcDashboardPage })))
const AmcListPage = lazy(() => import('@/features/service-contracts/pages/AmcListPage').then((m) => ({ default: m.AmcListPage })))
const AmcDetailPage = lazy(() => import('@/features/service-contracts/pages/AmcDetailPage').then((m) => ({ default: m.AmcDetailPage })))
const AmcFormPage = lazy(() => import('@/features/service-contracts/pages/AmcFormPage').then((m) => ({ default: m.AmcFormPage })))
const WarrantiesPage = lazy(() => import('@/features/service-contracts/pages/WarrantiesPage').then((m) => ({ default: m.WarrantiesPage })))
const TicketsPage = lazy(() => import('@/features/support/pages/TicketsPage').then((m) => ({ default: m.TicketsPage })))
const TicketDetailPage = lazy(() => import('@/features/support/pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })))
const CreateTicketPage = lazy(() => import('@/features/support/pages/CreateTicketPage').then((m) => ({ default: m.CreateTicketPage })))
const SlaConfigPage = lazy(() => import('@/features/support/pages/SlaConfigPage').then((m) => ({ default: m.SlaConfigPage })))
const AttendancePage = lazy(() => import('@/features/workforce/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })))
const EmployeeFormPage = lazy(() => import('@/features/workforce/pages/EmployeeFormPage').then((m) => ({ default: m.EmployeeFormPage })))
const EmployeeListPage = lazy(() => import('@/features/workforce/pages/EmployeeListPage').then((m) => ({ default: m.EmployeeListPage })))
const EmployeeProfilePage = lazy(() => import('@/features/workforce/pages/EmployeeProfilePage').then((m) => ({ default: m.EmployeeProfilePage })))
const MyProfilePage = lazy(() => import('@/features/workforce/pages/MyProfilePage').then((m) => ({ default: m.MyProfilePage })))
const NotificationCenterPage = lazy(() => import('@/features/notifications/pages/NotificationCenterPage').then((m) => ({ default: m.NotificationCenterPage })))
const NotificationPreferencesPage = lazy(() => import('@/features/notifications/pages/NotificationPreferencesPage').then((m) => ({ default: m.NotificationPreferencesPage })))
const ReceivablesDashboardPage = lazy(() => import('@/features/receivables/pages/ReceivablesDashboardPage').then((m) => ({ default: m.ReceivablesDashboardPage })))
const OutstandingInvoicesPage = lazy(() => import('@/features/receivables/pages/OutstandingInvoicesPage').then((m) => ({ default: m.OutstandingInvoicesPage })))
const OverdueInvoicesPage = lazy(() => import('@/features/receivables/pages/OverdueInvoicesPage').then((m) => ({ default: m.OverdueInvoicesPage })))
const CollectionTasksPage = lazy(() => import('@/features/receivables/pages/CollectionTasksPage').then((m) => ({ default: m.CollectionTasksPage })))
const ReceivablesConfigPage = lazy(() => import('@/features/receivables/pages/ReceivablesConfigPage').then((m) => ({ default: m.ReceivablesConfigPage })))
const VendorsPage = lazy(() => import('@/features/vendors/pages/VendorsPage').then((m) => ({ default: m.VendorsPage })))
const VendorDetailPage = lazy(() => import('@/features/vendors/pages/VendorDetailPage').then((m) => ({ default: m.VendorDetailPage })))
const VendorFormPage = lazy(() => import('@/features/vendors/pages/VendorFormPage').then((m) => ({ default: m.VendorFormPage })))
const PartnersPage = lazy(() => import('@/features/vendors/pages/PartnersPage').then((m) => ({ default: m.PartnersPage })))
const PartnerFormPage = lazy(() => import('@/features/vendors/pages/PartnerFormPage').then((m) => ({ default: m.PartnerFormPage })))
const PerformanceDashboardPage = lazy(() => import('@/features/performance/pages/PerformanceDashboardPage').then((m) => ({ default: m.PerformanceDashboardPage })))
const TeamPerformancePage = lazy(() => import('@/features/performance/pages/TeamPerformancePage').then((m) => ({ default: m.TeamPerformancePage })))
const CommissionRulesPage = lazy(() => import('@/features/performance/pages/CommissionRulesPage').then((m) => ({ default: m.CommissionRulesPage })))
const CommissionRecordsPage = lazy(() => import('@/features/performance/pages/CommissionRecordsPage').then((m) => ({ default: m.CommissionRecordsPage })))
const WorkflowRulesPage = lazy(() => import('@/features/workflow/pages/WorkflowRulesPage').then((m) => ({ default: m.WorkflowRulesPage })))
const WorkflowRuleFormPage = lazy(() => import('@/features/workflow/pages/WorkflowRuleFormPage').then((m) => ({ default: m.WorkflowRuleFormPage })))
const WorkflowExecutionLogPage = lazy(() => import('@/features/workflow/pages/WorkflowExecutionLogPage').then((m) => ({ default: m.WorkflowExecutionLogPage })))
const DocumentsPage = lazy(() => import('@/features/documents/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })))
const MyDocumentsPage = lazy(() => import('@/features/documents/pages/MyDocumentsPage').then((m) => ({ default: m.MyDocumentsPage })))
const JobsPage = lazy(() => import('@/features/recruitment/pages/JobsPage').then((m) => ({ default: m.JobsPage })))
const JobDetailPage = lazy(() => import('@/features/recruitment/pages/JobDetailPage').then((m) => ({ default: m.JobDetailPage })))
const JobFormPage = lazy(() => import('@/features/recruitment/pages/JobFormPage').then((m) => ({ default: m.JobFormPage })))
const CandidatesPage = lazy(() => import('@/features/recruitment/pages/CandidatesPage').then((m) => ({ default: m.CandidatesPage })))
const CandidateProfilePage = lazy(() => import('@/features/recruitment/pages/CandidateProfilePage').then((m) => ({ default: m.CandidateProfilePage })))
const CandidateFormPage = lazy(() => import('@/features/recruitment/pages/CandidateFormPage').then((m) => ({ default: m.CandidateFormPage })))
const ApplicationDetailPage = lazy(() => import('@/features/recruitment/pages/ApplicationDetailPage').then((m) => ({ default: m.ApplicationDetailPage })))
const AchievementRulesPage = lazy(() => import('@/features/rewards/pages/AchievementRulesPage').then((m) => ({ default: m.AchievementRulesPage })))
const AchievementsPage = lazy(() => import('@/features/rewards/pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })))
const CustomerRewardsPage = lazy(() => import('@/features/rewards/pages/CustomerRewardsPage').then((m) => ({ default: m.CustomerRewardsPage })))
const SearchResultsPage = lazy(() => import('@/features/search/pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage })))
const SalesDashboardPage = lazy(() => import('@/features/analytics/pages/SalesDashboardPage').then((m) => ({ default: m.SalesDashboardPage })))
const ProjectsDashboardPage = lazy(() => import('@/features/analytics/pages/ProjectsDashboardPage').then((m) => ({ default: m.ProjectsDashboardPage })))
const FinanceDashboardPage = lazy(() => import('@/features/analytics/pages/FinanceDashboardPage').then((m) => ({ default: m.FinanceDashboardPage })))
const ServiceDashboardPage = lazy(() => import('@/features/analytics/pages/ServiceDashboardPage').then((m) => ({ default: m.ServiceDashboardPage })))
const WorkforceDashboardPage = lazy(() => import('@/features/analytics/pages/WorkforceDashboardPage').then((m) => ({ default: m.WorkforceDashboardPage })))
const TitanicAnalyticsPage = lazy(() => import('@/features/analytics/pages/TitanicAnalyticsPage').then((m) => ({ default: m.TitanicAnalyticsPage })))
const PulseFeedPage = lazy(() => import('@/features/pulse/pages/PulseFeedPage').then((m) => ({ default: m.PulseFeedPage })))
const PulseRisksPage = lazy(() => import('@/features/pulse/pages/PulseRisksPage').then((m) => ({ default: m.PulseRisksPage })))
const PulseOpportunitiesPage = lazy(() => import('@/features/pulse/pages/PulseOpportunitiesPage').then((m) => ({ default: m.PulseOpportunitiesPage })))
const CustomerIntelligencePage = lazy(() => import('@/features/intelligence/pages/CustomerIntelligencePage').then((m) => ({ default: m.CustomerIntelligencePage })))
const CustomerIntelligenceDetailPage = lazy(() => import('@/features/intelligence/pages/CustomerIntelligenceDetailPage').then((m) => ({ default: m.CustomerIntelligenceDetailPage })))
const DailyBriefPage = lazy(() => import('@/features/brief/pages/DailyBriefPage').then((m) => ({ default: m.DailyBriefPage })))
const AskPawanPage = lazy(() => import('@/features/ask/pages/AskPawanPage').then((m) => ({ default: m.AskPawanPage })))
const IntegrationsPage = lazy(() => import('@/features/integrations/pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })))
const IntegrationDetailPage = lazy(() => import('@/features/integrations/pages/IntegrationDetailPage').then((m) => ({ default: m.IntegrationDetailPage })))
const AdminHubPage = lazy(() => import('@/features/admin/pages/AdminHubPage').then((m) => ({ default: m.AdminHubPage })))
const AdminRolesPage = lazy(() => import('@/features/admin/pages/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })))
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))

const needs = (permission: string, page: ReactNode) => (
  <RequirePermission permission={permission}>{page}</RequirePermission>
)

const needsAny = (permissions: string[], page: ReactNode) => (
  <RequireAnyPermission permissions={permissions}>{page}</RequireAnyPermission>
)

// Everything except /login is behind RequireAuth, and each admin page names the permission it needs.
// These guards only decide what to show; the API enforces the same rules on every request.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      // The invoice as a document: outside the shell, so nothing of the application prints with it.
      { path: '/invoices/:id/print', element: needs('FINANCE_VIEW', <InvoicePrintPage />) },
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'my-work', element: <MyWorkPage /> },

          { path: 'activities', element: needs('ACTIVITY_VIEW', <ActivitiesPage />) },

          { path: 'customers', element: needs('CUSTOMER_VIEW', <CustomersPage />) },
          { path: 'customers/new', element: needs('CUSTOMER_CREATE', <CustomerFormPage />) },
          { path: 'customers/:id', element: needs('CUSTOMER_VIEW', <CustomerProfilePage />) },
          { path: 'customers/:id/edit', element: needs('CUSTOMER_UPDATE', <CustomerFormPage />) },

          { path: 'leads', element: needs('LEAD_VIEW', <LeadsPage />) },
          { path: 'leads/new', element: needs('LEAD_CREATE', <LeadFormPage />) },
          { path: 'leads/qualification', element: needs('LEAD_CONFIGURE', <QualificationQuestionsPage />) },
          { path: 'leads/:id', element: needs('LEAD_VIEW', <LeadDetailPage />) },
          { path: 'leads/:id/edit', element: needs('LEAD_UPDATE', <LeadFormPage />) },

          { path: 'opportunities', element: needs('OPPORTUNITY_VIEW', <OpportunitiesPage />) },

          { path: 'quotations', element: needs('QUOTATION_VIEW', <QuotationsPage />) },
          { path: 'quotations/:id', element: needs('QUOTATION_VIEW', <QuotationDetailPage />) },

          { path: 'orders', element: needs('ORDER_VIEW', <OrdersPage />) },
          { path: 'orders/:id', element: needs('ORDER_VIEW', <OrderDetailPage />) },

          { path: 'projects', element: needs('PROJECT_VIEW', <ProjectsPage />) },
          { path: 'projects/:id', element: needs('PROJECT_VIEW', <ProjectDetailPage />) },

          { path: 'admin/qualification-questions', element: needs('LEAD_CONFIGURE', <QualificationQuestionsPage />) },

          { path: 'my-jobs', element: needs('FIELD_JOB_WORK', <MyJobsPage />) },
          { path: 'field-jobs', element: needsAny(['FIELD_JOB_VIEW', 'FIELD_JOB_MANAGE'], <FieldJobsPage />) },
          { path: 'field-jobs/new', element: needs('FIELD_JOB_MANAGE', <FieldJobFormPage />) },
          { path: 'field-jobs/:id', element: needsAny(['FIELD_JOB_WORK', 'FIELD_JOB_VIEW', 'FIELD_JOB_MANAGE'], <FieldJobPage />) },
          { path: 'field-jobs/:id/edit', element: needs('FIELD_JOB_MANAGE', <FieldJobFormPage />) },

          { path: 'invoices', element: needs('FINANCE_VIEW', <InvoicesPage />) },
          { path: 'invoices/new', element: needs('FINANCE_MANAGE', <InvoiceFormPage />) },
          { path: 'invoices/:id', element: needs('FINANCE_VIEW', <InvoicePage />) },
          { path: 'invoices/:id/edit', element: needs('FINANCE_MANAGE', <InvoiceFormPage />) },
          { path: 'payments', element: needs('FINANCE_VIEW', <PaymentsPage />) },
          { path: 'payments/new', element: needs('FINANCE_MANAGE', <PaymentFormPage />) },
          { path: 'payments/:id', element: needs('FINANCE_VIEW', <PaymentPage />) },
          { path: 'finance/ageing', element: needs('FINANCE_VIEW', <AgeingPage />) },
          { path: 'admin/payment-methods', element: needs('FINANCE_VIEW', <PaymentMethodsPage />) },

          { path: 'project-analytics', element: needs('PROJECT_VIEW', <ProjectAnalyticsPage />) },
          { path: 'admin/project-templates', element: needs('PROJECT_VIEW', <ProjectTemplatesPage />) },
          { path: 'admin/project-templates/new', element: needs('PROJECT_CONFIGURE', <ProjectTemplateFormPage />) },
          { path: 'admin/project-templates/:id', element: needs('PROJECT_VIEW', <ProjectTemplatePage />) },
          { path: 'admin/project-templates/:id/edit', element: needs('PROJECT_CONFIGURE', <ProjectTemplateFormPage />) },

          { path: 'admin/services', element: needs('CATALOG_VIEW', <ServicesPage />) },
          { path: 'admin/services/new', element: needs('CATALOG_CREATE', <ServiceFormPage />) },
          { path: 'admin/services/:id/edit', element: needs('CATALOG_UPDATE', <ServiceFormPage />) },
          { path: 'admin/services/:id/fields', element: needs('CATALOG_VIEW', <ServiceFieldsPage />) },

          { path: 'admin/categories', element: needs('CATALOG_VIEW', <CategoriesPage />) },
          { path: 'admin/categories/new', element: needs('CATALOG_CREATE', <CategoryFormPage />) },
          { path: 'admin/categories/:id/edit', element: needs('CATALOG_UPDATE', <CategoryFormPage />) },

          { path: 'admin/verticals', element: needs('CATALOG_VIEW', <VerticalsPage />) },
          { path: 'admin/verticals/:code/edit', element: needs('CATALOG_UPDATE', <VerticalFormPage />) },

          { path: 'admin/branches', element: needs('BRANCH_VIEW', <BranchesPage />) },
          { path: 'admin/branches/new', element: needs('BRANCH_CREATE', <BranchFormPage />) },
          { path: 'admin/branches/:id/edit', element: needs('BRANCH_UPDATE', <BranchFormPage />) },

          { path: 'admin', element: <AdminHubPage /> },
          { path: 'admin/users', element: needs('USER_VIEW', <AdminUsersPage />) },
          { path: 'admin/roles', element: needs('ROLE_VIEW', <AdminRolesPage />) },
          { path: 'admin/audit', element: needs('AUDIT_VIEW', <AuditLogPage />) },
          { path: 'admin/audit/:id', element: needs('AUDIT_VIEW', <AuditLogDetailPage />) },

          { path: 'support/tickets', element: needsAny(['TICKET_VIEW', 'TICKET_CREATE', 'TICKET_MANAGE'], <TicketsPage />) },
          { path: 'support/tickets/new', element: needsAny(['TICKET_CREATE', 'TICKET_MANAGE'], <CreateTicketPage />) },
          { path: 'support/tickets/:id', element: needsAny(['TICKET_VIEW', 'TICKET_CREATE', 'TICKET_MANAGE'], <TicketDetailPage />) },
          { path: 'admin/sla', element: needs('TICKET_MANAGE', <SlaConfigPage />) },

          { path: 'workforce/employees', element: needs('WORKFORCE_VIEW', <EmployeeListPage />) },
          { path: 'workforce/employees/new', element: needs('WORKFORCE_CREATE', <EmployeeFormPage />) },
          { path: 'workforce/employees/:id', element: needs('WORKFORCE_VIEW', <EmployeeProfilePage />) },
          { path: 'workforce/employees/:id/edit', element: needs('WORKFORCE_UPDATE', <EmployeeFormPage />) },
          { path: 'workforce/attendance', element: needsAny(['WORKFORCE_VIEW', 'WORKFORCE_CREATE'], <AttendancePage />) },
          { path: 'workforce/my-profile', element: needs('WORKFORCE_VIEW', <MyProfilePage />) },

          { path: 'performance/dashboard', element: needs('PERFORMANCE_VIEW', <PerformanceDashboardPage />) },
          { path: 'performance/team', element: needs('PERFORMANCE_VIEW', <TeamPerformancePage />) },
          { path: 'performance/commission-rules', element: needs('COMMISSION_VIEW', <CommissionRulesPage />) },
          { path: 'performance/commissions', element: needs('COMMISSION_VIEW', <CommissionRecordsPage />) },

          { path: 'vendors', element: needs('VENDOR_VIEW', <VendorsPage />) },
          { path: 'vendors/new', element: needs('VENDOR_CREATE', <VendorFormPage />) },
          { path: 'vendors/:id', element: needs('VENDOR_VIEW', <VendorDetailPage />) },
          { path: 'vendors/:id/edit', element: needs('VENDOR_UPDATE', <VendorFormPage />) },

          { path: 'partners', element: needs('PARTNER_VIEW', <PartnersPage />) },
          { path: 'partners/new', element: needs('PARTNER_MANAGE', <PartnerFormPage />) },
          { path: 'partners/:id/edit', element: needs('PARTNER_MANAGE', <PartnerFormPage />) },

          { path: 'receivables', element: needs('RECEIVABLES_VIEW', <ReceivablesDashboardPage />) },
          { path: 'receivables/outstanding', element: needs('RECEIVABLES_VIEW', <OutstandingInvoicesPage />) },
          { path: 'receivables/overdue', element: needs('RECEIVABLES_VIEW', <OverdueInvoicesPage />) },
          { path: 'receivables/collection-tasks', element: needsAny(['RECEIVABLES_VIEW', 'RECEIVABLES_MANAGE'], <CollectionTasksPage />) },
          { path: 'receivables/config', element: needs('RECEIVABLES_VIEW', <ReceivablesConfigPage />) },

          { path: 'notifications', element: needs('NOTIFICATION_VIEW', <NotificationCenterPage />) },
          { path: 'notifications/preferences', element: needs('NOTIFICATION_VIEW', <NotificationPreferencesPage />) },

          { path: 'service-contracts', element: needs('AMC_VIEW', <AmcDashboardPage />) },
          { path: 'amc-contracts', element: needs('AMC_VIEW', <AmcListPage />) },
          { path: 'amc-contracts/new', element: needs('AMC_MANAGE', <AmcFormPage />) },
          { path: 'amc-contracts/:id', element: needs('AMC_VIEW', <AmcDetailPage />) },
          { path: 'amc-contracts/:id/edit', element: needs('AMC_MANAGE', <AmcFormPage />) },
          { path: 'warranties', element: needs('WARRANTY_VIEW', <WarrantiesPage />) },

          { path: 'documents', element: needs('DOCUMENT_VIEW', <DocumentsPage />) },
          { path: 'documents/mine', element: needs('DOCUMENT_VIEW', <MyDocumentsPage />) },

          { path: 'admin/workflow-rules', element: needs('WORKFLOW_VIEW', <WorkflowRulesPage />) },
          { path: 'admin/workflow-rules/new', element: needs('WORKFLOW_MANAGE', <WorkflowRuleFormPage />) },
          { path: 'admin/workflow-rules/:id/edit', element: needs('WORKFLOW_MANAGE', <WorkflowRuleFormPage />) },
          { path: 'admin/workflow-rules/execution-log', element: needs('WORKFLOW_VIEW', <WorkflowExecutionLogPage />) },

          { path: 'search', element: needsAny(ANY_SEARCH_PERMISSION, <SearchResultsPage />) },

          { path: 'rewards/achievement-rules', element: needs('REWARDS_VIEW', <AchievementRulesPage />) },
          { path: 'rewards/leaderboard', element: needs('REWARDS_VIEW', <AchievementsPage />) },
          { path: 'rewards/customer', element: needs('REWARDS_VIEW', <CustomerRewardsPage />) },

          // A dashboard needs ANALYTICS_VIEW and the permission of the module whose figures it shows (the API requires the same).
          { path: 'analytics/executive', element: <Navigate to="/" replace /> },
          { path: 'analytics/sales', element: needs('ANALYTICS_VIEW', needsAny(['LEAD_VIEW', 'OPPORTUNITY_VIEW'], <SalesDashboardPage />)) },
          { path: 'analytics/projects', element: needs('ANALYTICS_VIEW', needs('PROJECT_VIEW', <ProjectsDashboardPage />)) },
          { path: 'analytics/finance', element: needs('ANALYTICS_VIEW', needs('FINANCE_VIEW', <FinanceDashboardPage />)) },
          { path: 'analytics/service', element: needs('ANALYTICS_VIEW', needsAny(['TICKET_VIEW', 'AMC_VIEW'], <ServiceDashboardPage />)) },
          { path: 'analytics/workforce', element: needs('ANALYTICS_VIEW', needs('WORKFORCE_VIEW', <WorkforceDashboardPage />)) },
          { path: 'analytics/titanic', element: <TitanicAnalyticsPage /> },

          { path: 'intelligence', element: needs('INTELLIGENCE_VIEW', <CustomerIntelligencePage />) },
          { path: 'customers/:id/intelligence', element: needs('INTELLIGENCE_VIEW', <CustomerIntelligenceDetailPage />) },

          { path: 'recruitment/jobs', element: needs('RECRUITMENT_VIEW', <JobsPage />) },
          { path: 'recruitment/jobs/new', element: needs('RECRUITMENT_MANAGE', <JobFormPage />) },
          { path: 'recruitment/jobs/:id', element: needs('RECRUITMENT_VIEW', <JobDetailPage />) },
          { path: 'recruitment/jobs/:id/edit', element: needs('RECRUITMENT_MANAGE', <JobFormPage />) },
          { path: 'recruitment/candidates', element: needs('RECRUITMENT_VIEW', <CandidatesPage />) },
          { path: 'recruitment/candidates/new', element: needs('RECRUITMENT_MANAGE', <CandidateFormPage />) },
          { path: 'recruitment/candidates/:id', element: needs('RECRUITMENT_VIEW', <CandidateProfilePage />) },
          { path: 'recruitment/candidates/:id/edit', element: needs('RECRUITMENT_MANAGE', <CandidateFormPage />) },
          { path: 'recruitment/applications', element: <Navigate to="/recruitment/jobs" replace /> },
          { path: 'recruitment/applications/:id', element: needs('RECRUITMENT_VIEW', <ApplicationDetailPage />) },

          { path: 'pulse', element: needs('PULSE_VIEW', <PulseFeedPage />) },
          { path: 'pulse/risks', element: needs('PULSE_VIEW', <PulseRisksPage />) },
          { path: 'pulse/opportunities', element: needs('PULSE_VIEW', <PulseOpportunitiesPage />) },

          { path: 'brief', element: <DailyBriefPage /> },
          { path: 'ask', element: <AskPawanPage /> },

          { path: 'admin/integrations', element: needs('INTEGRATION_VIEW', <IntegrationsPage />) },
          { path: 'admin/integrations/:type', element: needs('INTEGRATION_VIEW', <IntegrationDetailPage />) },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
