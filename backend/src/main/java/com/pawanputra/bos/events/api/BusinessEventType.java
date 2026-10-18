package com.pawanputra.bos.events.api;

/**
 * Every named business event the platform knows how to record. Stored as a VARCHAR in the
 * {@code business_events} table so historical rows are readable even after a rename.
 *
 * <p>Adding a value here is the only change required to start recording a new event type; there is
 * no schema change. Convention: NOUN_PAST_TENSE, matching the modules that own the noun.
 */
public enum BusinessEventType {

    // ---- CRM
    LEAD_CREATED,
    LEAD_QUALIFIED,
    LEAD_CONVERTED,

    QUOTE_CREATED,
    QUOTE_ACCEPTED,
    QUOTE_REJECTED,

    ORDER_CREATED,
    ORDER_CONFIRMED,
    ORDER_CANCELLED,

    // ---- Projects
    PROJECT_STARTED,
    PROJECT_COMPLETED,
    PROJECT_DELAYED,
    TASK_COMPLETED,
    MILESTONE_REACHED,

    // ---- Finance
    PAYMENT_RECEIVED,
    PAYMENT_OVERDUE,
    INVOICE_ISSUED,
    INVOICE_CANCELLED,

    // ---- Service
    TICKET_CREATED,
    TICKET_RESOLVED,
    TICKET_SLA_BREACHED,
    AMC_EXPIRING,
    AMC_RENEWED,
    AMC_EXPIRED,
    WARRANTY_CLAIMED,

    // ---- Workforce
    ATTENDANCE_MARKED,

    // ---- Vendor
    VENDOR_ADDED,

    // ---- System
    USER_CREATED,
    USER_DEACTIVATED,
}
