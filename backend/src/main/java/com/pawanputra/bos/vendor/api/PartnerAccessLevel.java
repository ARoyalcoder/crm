package com.pawanputra.bos.vendor.api;

/**
 * The access level granted to a partner organisation. Partners NEVER receive unrestricted CRM
 * access — the most permissive level is LIMITED_OPERATIONS.
 */
public enum PartnerAccessLevel {
    /** Can only view data that is explicitly shared with them. */
    READ_ONLY,
    /** Can view and update only the projects explicitly assigned to them. */
    ASSIGNED_PROJECTS,
    /** A restricted set of operations agreed on at onboarding; still not full CRM access. */
    LIMITED_OPERATIONS
}
