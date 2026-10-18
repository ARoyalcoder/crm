package com.pawanputra.bos.intelligence.api;

/** How a customer is classified based on their scored health and revenue profile. */
public enum CustomerSegment {
    /** Score 80-100: healthy relationship, consistent payments and engagement. */
    HEALTHY,
    /** Score 50-79, or below 50 with overdue invoices: relationship needs attention. */
    AT_RISK,
    /** Score below 50 and last purchase more than 180 days ago: customer has gone quiet. */
    INACTIVE,
    /** Score 70+ and total revenue above ₹500,000: a top-tier account. */
    HIGH_VALUE,
    /** Account less than 90 days old with at least one purchase: still in the honeymoon period. */
    NEW
}
