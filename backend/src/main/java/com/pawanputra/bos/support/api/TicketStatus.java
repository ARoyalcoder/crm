package com.pawanputra.bos.support.api;

/**
 * Where a support ticket stands in its lifecycle.
 *
 * <pre>OPEN → ASSIGNED → IN_PROGRESS → WAITING_CUSTOMER → RESOLVED → CLOSED</pre>
 *
 * A resolved ticket may be re-opened back to OPEN if the customer is not satisfied.
 */
public enum TicketStatus {

    /** Received but not yet claimed by any agent. */
    OPEN,

    /** Given to a specific agent. */
    ASSIGNED,

    /** Agent is actively working on it. */
    IN_PROGRESS,

    /** Waiting for a response from the customer before proceeding. */
    WAITING_CUSTOMER,

    /** Work is done; the solution has been delivered to the customer. */
    RESOLVED,

    /** Permanently closed; no further changes expected. */
    CLOSED;

    /** The ticket is no longer being worked on. */
    public boolean isTerminal() {
        return this == RESOLVED || this == CLOSED;
    }

    /** The ticket can still receive agent action. */
    public boolean isActive() {
        return !isTerminal();
    }
}
