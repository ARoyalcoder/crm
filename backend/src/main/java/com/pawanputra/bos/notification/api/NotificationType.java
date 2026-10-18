package com.pawanputra.bos.notification.api;

/**
 * Visual category of an in-app notification. The frontend maps each value to an icon and colour.
 */
public enum NotificationType {
    /** Neutral, informational message. */
    INFO,
    /** Action completed successfully. */
    SUCCESS,
    /** Something needs attention but is not critical. */
    WARNING,
    /** Urgent: requires immediate action. */
    CRITICAL,
    /** Positive milestone — a goal reached, a deal closed, etc. */
    ACHIEVEMENT,
    /** A new business opportunity worth acting on. */
    OPPORTUNITY,
    /** A risk to a project, contract, or relationship. */
    RISK,
}
