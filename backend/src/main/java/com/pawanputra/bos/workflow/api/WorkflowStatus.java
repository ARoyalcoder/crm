package com.pawanputra.bos.workflow.api;

/**
 * Lifecycle state of a {@code WorkflowRule}.
 * Only ACTIVE rules are evaluated when a business event fires.
 */
public enum WorkflowStatus {
    /** Rule is being built; not evaluated. */
    DRAFT,
    /** Rule is evaluated on every matching event. */
    ACTIVE,
    /** Rule has been disabled but is kept for history. */
    INACTIVE,
}
