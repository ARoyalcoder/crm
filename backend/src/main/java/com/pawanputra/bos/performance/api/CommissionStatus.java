package com.pawanputra.bos.performance.api;

/** Lifecycle state of a commission record. */
public enum CommissionStatus {
    /** Calculated and waiting for review. */
    PENDING,
    /** Reviewed and approved for payment. */
    APPROVED,
    /** Payment has been disbursed to the employee. */
    PAID,
    /** Voided — the triggering transaction was cancelled or the record was an error. */
    CANCELLED
}
