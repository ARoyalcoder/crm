package com.pawanputra.bos.analytics.internal;

/**
 * SQL fragments for "is this project still running?". Whether a status is a finished one comes from the
 * organization's configurable {@code project_statuses} flags. The project module only creates those rows the
 * first time it is used for an organization, so until then a project's status code is read against the
 * defaults that module starts every organization with (COMPLETED and CANCELLED), instead of every project
 * counting as running.
 */
final class ProjectSql {

    private ProjectSql() {
    }

    /** Joins the status flags of a project aliased {@code p}. */
    static final String JOIN_STATUS = "LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status ";

    static final String DONE = "coalesce(ps.is_completed, p.status = 'COMPLETED')";
    static final String CANCELLED = "coalesce(ps.is_cancelled, p.status = 'CANCELLED')";
    static final String ACTIVE = "(NOT " + DONE + " AND NOT " + CANCELLED + ")";

    /** Position of the status in the flow: the configured order, or the default flow for statuses not configured yet. */
    static final String STATUS_ORDER = "coalesce(ps.display_order, CASE p.status WHEN 'PLANNING' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'ON_HOLD' THEN 3 WHEN 'IN_REVIEW' THEN 4 WHEN 'COMPLETED' THEN 5 WHEN 'CANCELLED' THEN 6 ELSE 99 END)";

    /** The status as people read it: the configured name, or the code made readable. */
    static final String STATUS_NAME = "coalesce(ps.name, initcap(replace(lower(p.status), '_', ' ')))";
}
