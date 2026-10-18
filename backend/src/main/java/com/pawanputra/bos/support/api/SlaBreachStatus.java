package com.pawanputra.bos.support.api;

/** Whether the SLA deadline has been met, is at risk, or has already been breached. */
public enum SlaBreachStatus {

    /** Well within the SLA deadline. */
    ON_TRACK,

    /** More than 80 % of the resolution window has elapsed without resolution. */
    AT_RISK,

    /** The resolution deadline passed without the ticket being resolved. */
    BREACHED,

    /** No SLA is attached to this ticket. */
    NOT_APPLICABLE;
}
