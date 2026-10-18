package com.pawanputra.bos.intelligence.api;

/** The six transparent scoring dimensions that add up to 100 points. */
public enum ScoreContributor {
    /** Payment behaviour: overdue invoice count and payment timeliness. Max 30 pts. */
    PAYMENT_BEHAVIOUR,
    /** Project delivery: on-time vs delayed project completion rate. Max 20 pts. */
    PROJECT_DELIVERY,
    /** Support activity: ticket volume and open ticket count in last 90 days. Max 15 pts. */
    SUPPORT_ACTIVITY,
    /** AMC / service contract status and time to expiry. Max 15 pts. */
    AMC_STATUS,
    /** Recency of last logged customer interaction. Max 10 pts. */
    ENGAGEMENT,
    /** Number of purchases in the last 12 months. Max 10 pts. */
    PURCHASE_FREQUENCY
}
