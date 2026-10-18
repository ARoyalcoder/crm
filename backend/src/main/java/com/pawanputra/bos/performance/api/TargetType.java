package com.pawanputra.bos.performance.api;

/** The kind of metric a performance target measures. */
public enum TargetType {
    /** Total revenue from issued/paid invoices linked to the employee's orders. */
    SALES_REVENUE,
    /** Total payments collected in the period. */
    COLLECTION_AMOUNT,
    /** Number of projects completed in the period. */
    PROJECT_COMPLETION,
    /** Number of follow-up activities completed in the period. */
    FOLLOW_UP_COUNT,
    /** Average customer satisfaction score in the period (0-100). */
    CUSTOMER_SATISFACTION,
    /** Number of orders confirmed in the period. */
    ORDER_COUNT,
    /** Lead-to-order conversion rate (as a percentage). */
    LEAD_CONVERSION
}
