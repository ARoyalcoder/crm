package com.pawanputra.bos.identity.api;

import java.util.Set;

/**
 * Every permission the application knows, named {@code MODULE_ACTION}. Use these constants wherever a
 * permission is checked so a typo is a compile error:
 *
 * <pre>{@code @PreAuthorize("hasAuthority('" + Permissions.CUSTOMER_VIEW + "')")}</pre>
 *
 * <p>This list and the {@code permissions} table must match; {@code PermissionCatalogIT} fails if
 * they drift. To add a permission: add the constant here, add it to {@link #ALL}, and insert it
 * (plus its grant to {@code SUPER_ADMIN}) in a new Flyway migration.
 */
public final class Permissions {

    public static final String USER_VIEW = "USER_VIEW";
    public static final String USER_CREATE = "USER_CREATE";
    public static final String USER_UPDATE = "USER_UPDATE";
    public static final String USER_DELETE = "USER_DELETE";

    public static final String ROLE_VIEW = "ROLE_VIEW";
    public static final String ROLE_UPDATE = "ROLE_UPDATE";

    public static final String ORGANIZATION_VIEW = "ORGANIZATION_VIEW";
    public static final String ORGANIZATION_UPDATE = "ORGANIZATION_UPDATE";

    public static final String BRANCH_VIEW = "BRANCH_VIEW";
    public static final String BRANCH_CREATE = "BRANCH_CREATE";
    public static final String BRANCH_UPDATE = "BRANCH_UPDATE";
    public static final String BRANCH_DELETE = "BRANCH_DELETE";

    public static final String CATALOG_VIEW = "CATALOG_VIEW";
    public static final String CATALOG_CREATE = "CATALOG_CREATE";
    public static final String CATALOG_UPDATE = "CATALOG_UPDATE";
    public static final String CATALOG_DELETE = "CATALOG_DELETE";

    public static final String CUSTOMER_VIEW = "CUSTOMER_VIEW";
    public static final String CUSTOMER_CREATE = "CUSTOMER_CREATE";
    public static final String CUSTOMER_UPDATE = "CUSTOMER_UPDATE";
    public static final String CUSTOMER_DELETE = "CUSTOMER_DELETE";
    public static final String CUSTOMER_EXPORT = "CUSTOMER_EXPORT";

    public static final String LEAD_VIEW = "LEAD_VIEW";
    public static final String LEAD_CREATE = "LEAD_CREATE";
    public static final String LEAD_UPDATE = "LEAD_UPDATE";
    public static final String LEAD_DELETE = "LEAD_DELETE";
    /** Defining the qualification questions and what their answers are worth. */
    public static final String LEAD_CONFIGURE = "LEAD_CONFIGURE";

    public static final String PROJECT_VIEW = "PROJECT_VIEW";
    public static final String PROJECT_CREATE = "PROJECT_CREATE";
    public static final String PROJECT_UPDATE = "PROJECT_UPDATE";
    public static final String PROJECT_DELETE = "PROJECT_DELETE";
    /** Defining the project templates of the services. */
    public static final String PROJECT_CONFIGURE = "PROJECT_CONFIGURE";

    /** Carrying out the field jobs assigned to you (and seeing only those). */
    public static final String FIELD_JOB_WORK = "FIELD_JOB_WORK";
    public static final String FIELD_JOB_VIEW = "FIELD_JOB_VIEW";
    /** Creating, scheduling, assigning and cancelling field jobs. */
    public static final String FIELD_JOB_MANAGE = "FIELD_JOB_MANAGE";

    public static final String FINANCE_VIEW = "FINANCE_VIEW";
    /** Creating and issuing invoices, recording and allocating payments. */
    public static final String FINANCE_MANAGE = "FINANCE_MANAGE";
    /**
     * Everything that takes money back off the books: credit and debit notes, refunds, cancelling an
     * invoice, releasing an allocation, reversing a payment.
     */
    public static final String FINANCE_APPROVE = "FINANCE_APPROVE";
    /** Defining the payment methods. */
    public static final String FINANCE_CONFIGURE = "FINANCE_CONFIGURE";

    public static final String AUDIT_VIEW = "AUDIT_VIEW";

    public static final String ACTIVITY_VIEW = "ACTIVITY_VIEW";
    public static final String ACTIVITY_CREATE = "ACTIVITY_CREATE";
    public static final String ACTIVITY_UPDATE = "ACTIVITY_UPDATE";
    public static final String ACTIVITY_DELETE = "ACTIVITY_DELETE";

    public static final String OPPORTUNITY_VIEW = "OPPORTUNITY_VIEW";
    public static final String OPPORTUNITY_CREATE = "OPPORTUNITY_CREATE";
    public static final String OPPORTUNITY_UPDATE = "OPPORTUNITY_UPDATE";
    public static final String OPPORTUNITY_DELETE = "OPPORTUNITY_DELETE";
    public static final String OPPORTUNITY_CONFIGURE = "OPPORTUNITY_CONFIGURE";

    public static final String QUOTATION_VIEW = "QUOTATION_VIEW";
    public static final String QUOTATION_CREATE = "QUOTATION_CREATE";
    public static final String QUOTATION_UPDATE = "QUOTATION_UPDATE";
    public static final String QUOTATION_APPROVE = "QUOTATION_APPROVE";
    public static final String QUOTATION_DELETE = "QUOTATION_DELETE";

    public static final String ORDER_VIEW = "ORDER_VIEW";
    public static final String ORDER_CREATE = "ORDER_CREATE";
    public static final String ORDER_UPDATE = "ORDER_UPDATE";
    public static final String ORDER_CANCEL = "ORDER_CANCEL";

    public static final String PROOF_OF_WORK_VIEW = "PROOF_OF_WORK_VIEW";
    public static final String PROOF_OF_WORK_CREATE = "PROOF_OF_WORK_CREATE";
    public static final String PROOF_OF_WORK_VERIFY = "PROOF_OF_WORK_VERIFY";
    public static final String PROOF_OF_WORK_DELETE = "PROOF_OF_WORK_DELETE";

    public static final String WORKFORCE_VIEW = "WORKFORCE_VIEW";
    public static final String WORKFORCE_CREATE = "WORKFORCE_CREATE";
    public static final String WORKFORCE_UPDATE = "WORKFORCE_UPDATE";
    public static final String WORKFORCE_DELETE = "WORKFORCE_DELETE";

    public static final String WARRANTY_VIEW = "WARRANTY_VIEW";
    /** Creating, updating and voiding warranties. */
    public static final String WARRANTY_MANAGE = "WARRANTY_MANAGE";

    public static final String AMC_VIEW = "AMC_VIEW";
    /** Creating, editing, renewing AMC contracts and scheduling service visits. */
    public static final String AMC_MANAGE = "AMC_MANAGE";

    public static final String TICKET_VIEW = "TICKET_VIEW";
    public static final String TICKET_CREATE = "TICKET_CREATE";
    /** Assigning and re-assigning tickets to agents. */
    public static final String TICKET_ASSIGN = "TICKET_ASSIGN";
    /** Resolving and closing tickets. */
    public static final String TICKET_RESOLVE = "TICKET_RESOLVE";
    /** Full ticket management plus SLA configuration. */
    public static final String TICKET_MANAGE = "TICKET_MANAGE";

    public static final String VENDOR_VIEW = "VENDOR_VIEW";
    public static final String VENDOR_CREATE = "VENDOR_CREATE";
    public static final String VENDOR_UPDATE = "VENDOR_UPDATE";
    public static final String VENDOR_DELETE = "VENDOR_DELETE";
    /** Adding or updating scorecard ratings for a vendor. */
    public static final String VENDOR_SCORE = "VENDOR_SCORE";

    public static final String PARTNER_VIEW = "PARTNER_VIEW";
    /** Creating, editing and deleting partner organisations. */
    public static final String PARTNER_MANAGE = "PARTNER_MANAGE";

    /** View the receivables dashboard, outstanding invoices, ageing and collection tasks. */
    public static final String RECEIVABLES_VIEW = "RECEIVABLES_VIEW";
    /** Create and update collection tasks and manage receivables configuration. */
    public static final String RECEIVABLES_MANAGE = "RECEIVABLES_MANAGE";

    /** View and manage own in-app notifications and notification preferences. */
    public static final String NOTIFICATION_VIEW = "NOTIFICATION_VIEW";

    public static final String DOCUMENT_VIEW = "DOCUMENT_VIEW";
    public static final String DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD";
    public static final String DOCUMENT_DELETE = "DOCUMENT_DELETE";

    /** View workflow rules and their execution logs. */
    public static final String WORKFLOW_VIEW = "WORKFLOW_VIEW";
    /** Create, update, delete, enable and disable workflow rules. */
    public static final String WORKFLOW_MANAGE = "WORKFLOW_MANAGE";

    /** View performance targets and actual-vs-target summaries for employees. */
    public static final String PERFORMANCE_VIEW = "PERFORMANCE_VIEW";
    /** Set and update performance targets for employees. */
    public static final String PERFORMANCE_MANAGE = "PERFORMANCE_MANAGE";
    /** View commission rules and commission records. */
    public static final String COMMISSION_VIEW = "COMMISSION_VIEW";
    /** Create/update commission rules; approve, pay and cancel commission records. */
    public static final String COMMISSION_MANAGE = "COMMISSION_MANAGE";

    /** View achievement rules, user achievements, leaderboard and customer reward balances. */
    public static final String REWARDS_VIEW = "REWARDS_VIEW";
    /** Create/update achievement rules; add, adjust and redeem customer points. */
    public static final String REWARDS_MANAGE = "REWARDS_MANAGE";

    /** View analytics dashboards across all business domains. */
    public static final String ANALYTICS_VIEW = "ANALYTICS_VIEW";

    /** View job openings, candidates, applications and interviews. */
    public static final String RECRUITMENT_VIEW = "RECRUITMENT_VIEW";
    /** Create and manage job openings, candidates, applications and interviews. */
    public static final String RECRUITMENT_MANAGE = "RECRUITMENT_MANAGE";

    /** View customer intelligence: health scores, CLV, segments and score explanations. */
    public static final String INTELLIGENCE_VIEW = "INTELLIGENCE_VIEW";

    /** View the PAWAN PULSE AI insight feed (achievements, opportunities, risks, next best actions). */
    public static final String PULSE_VIEW = "PULSE_VIEW";

    /** View the AI Daily Brief personalised to the user's role. */
    public static final String BRIEF_VIEW = "BRIEF_VIEW";

    /** Use the Ask PAWAN AI natural-language query interface. */
    public static final String ASK_VIEW = "ASK_VIEW";

    /** View external integration configurations and their status. */
    public static final String INTEGRATION_VIEW = "INTEGRATION_VIEW";
    /** Configure, enable, disable and test external integrations. */
    public static final String INTEGRATION_MANAGE = "INTEGRATION_MANAGE";

    public static final Set<String> ALL = Set.of(
            USER_VIEW, USER_CREATE, USER_UPDATE, USER_DELETE,
            ROLE_VIEW, ROLE_UPDATE,
            ORGANIZATION_VIEW, ORGANIZATION_UPDATE,
            BRANCH_VIEW, BRANCH_CREATE, BRANCH_UPDATE, BRANCH_DELETE,
            CATALOG_VIEW, CATALOG_CREATE, CATALOG_UPDATE, CATALOG_DELETE,
            CUSTOMER_VIEW, CUSTOMER_CREATE, CUSTOMER_UPDATE, CUSTOMER_DELETE, CUSTOMER_EXPORT,
            LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, LEAD_CONFIGURE,
            PROJECT_VIEW, PROJECT_CREATE, PROJECT_UPDATE, PROJECT_DELETE, PROJECT_CONFIGURE,
            FIELD_JOB_WORK, FIELD_JOB_VIEW, FIELD_JOB_MANAGE,
            FINANCE_VIEW, FINANCE_MANAGE, FINANCE_APPROVE, FINANCE_CONFIGURE,
            AUDIT_VIEW,
            ACTIVITY_VIEW, ACTIVITY_CREATE, ACTIVITY_UPDATE, ACTIVITY_DELETE,
            OPPORTUNITY_VIEW, OPPORTUNITY_CREATE, OPPORTUNITY_UPDATE, OPPORTUNITY_DELETE, OPPORTUNITY_CONFIGURE,
            QUOTATION_VIEW, QUOTATION_CREATE, QUOTATION_UPDATE, QUOTATION_APPROVE, QUOTATION_DELETE,
            ORDER_VIEW, ORDER_CREATE, ORDER_UPDATE, ORDER_CANCEL,
            PROOF_OF_WORK_VIEW, PROOF_OF_WORK_CREATE, PROOF_OF_WORK_VERIFY, PROOF_OF_WORK_DELETE,
            WORKFORCE_VIEW, WORKFORCE_CREATE, WORKFORCE_UPDATE, WORKFORCE_DELETE,
            WARRANTY_VIEW, WARRANTY_MANAGE,
            AMC_VIEW, AMC_MANAGE,
            TICKET_VIEW, TICKET_CREATE, TICKET_ASSIGN, TICKET_RESOLVE, TICKET_MANAGE,
            VENDOR_VIEW, VENDOR_CREATE, VENDOR_UPDATE, VENDOR_DELETE, VENDOR_SCORE,
            PARTNER_VIEW, PARTNER_MANAGE,
            RECEIVABLES_VIEW, RECEIVABLES_MANAGE,
            NOTIFICATION_VIEW,
            DOCUMENT_VIEW, DOCUMENT_UPLOAD, DOCUMENT_DELETE,
            WORKFLOW_VIEW, WORKFLOW_MANAGE,
            PERFORMANCE_VIEW, PERFORMANCE_MANAGE,
            COMMISSION_VIEW, COMMISSION_MANAGE,
            REWARDS_VIEW, REWARDS_MANAGE,
            ANALYTICS_VIEW,
            RECRUITMENT_VIEW, RECRUITMENT_MANAGE,
            INTELLIGENCE_VIEW,
            PULSE_VIEW,
            INTEGRATION_VIEW, INTEGRATION_MANAGE,
            BRIEF_VIEW,
            ASK_VIEW);

    private Permissions() {
    }
}
