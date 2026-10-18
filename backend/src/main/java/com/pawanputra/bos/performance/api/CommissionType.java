package com.pawanputra.bos.performance.api;

/** How commission is calculated against the base amount. */
public enum CommissionType {
    /** A percentage of the base amount (e.g., 5.0 = 5%). */
    PERCENTAGE,
    /** A fixed monetary amount regardless of order size. */
    FIXED
}
