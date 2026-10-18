package com.pawanputra.bos.pulse.api;

/**
 * Fine-grained category within a {@link PulseInsightType}. Each engine produces a specific set of
 * categories; the grouping here mirrors the engine hierarchy.
 */
public enum PulseInsightCategory {

    // ---- ACHIEVEMENT
    FIRST_ORDER,
    TARGET_ACHIEVED,
    PERSONAL_BEST,
    PROJECT_COMPLETED,
    AMC_RENEWED,
    CUSTOMER_APPRECIATION,

    // ---- OPPORTUNITY
    AMC_RENEWAL,
    CROSS_SELL,
    UPSELL,
    INACTIVE_CUSTOMER,
    HIGH_VALUE_LEAD,

    // ---- RISK
    UNTOUCHED_LEAD,
    OVERDUE_PAYMENT,
    DELAYED_PROJECT,
    SLA_BREACH,
    AMC_EXPIRY,

    // ---- NEXT_BEST_ACTION
    CALL_CUSTOMER,
    SEND_QUOTATION,
    SCHEDULE_VISIT,
    COLLECT_PAYMENT,
    RESOLVE_TICKET,
    CONTACT_INACTIVE,
}
