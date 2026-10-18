package com.pawanputra.bos.analytics.internal;

import static com.pawanputra.bos.analytics.internal.Sql.money;
import static com.pawanputra.bos.analytics.internal.Sql.percent;

import com.pawanputra.bos.analytics.AnalyticsModels.CostRow;
import com.pawanputra.bos.analytics.AnalyticsModels.CountCompared;
import com.pawanputra.bos.analytics.AnalyticsModels.DelayedProject;
import com.pawanputra.bos.analytics.AnalyticsModels.DeliveryBucket;
import com.pawanputra.bos.analytics.AnalyticsModels.MilestoneRow;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectsOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.StatusCount;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Delivery figures. Whether a project is active, completed or cancelled comes from the organization's own
 * configurable project statuses ({@code project_statuses.is_completed / is_cancelled}), never from status
 * names, so renaming or adding a status cannot silently change a number.
 */
@Component
public class ProjectMetrics {

    private static final String FROM_PROJECTS = "FROM projects p " + ProjectSql.JOIN_STATUS;
    private static final String ACTIVE = ProjectSql.ACTIVE;
    private static final String DONE = ProjectSql.DONE;
    private static final String LIVE = "p.organization_id = :org AND p.deleted_at IS NULL";

    private final NamedParameterJdbcTemplate jdbc;

    ProjectMetrics(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static MapSqlParameterSource params(UUID org, Window window, LocalDate today) {
        return new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to()).addValue("today", today);
    }

    /** {completed, onTime, avg duration days} for the projects completed in the window. */
    private Object[] completed(UUID org, Window window, LocalDate today) {
        return jdbc.queryForObject(
                "SELECT count(*), count(*) FILTER (WHERE p.actual_completion_date <= p.expected_completion_date), avg(p.actual_completion_date - p.start_date) "
                        + FROM_PROJECTS + "WHERE " + LIVE + " AND " + DONE + " AND p.actual_completion_date BETWEEN :from AND :to",
                params(org, window, today),
                (rs, n) -> new Object[] {rs.getLong(1), rs.getLong(2), rs.getBigDecimal(3)});
    }

    public ProjectsOverview overview(UUID org, Window window, LocalDate today) {
        long[] now = jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE " + ACTIVE + "), count(*) FILTER (WHERE " + ACTIVE + " AND p.expected_completion_date < :today) "
                        + FROM_PROJECTS + "WHERE " + LIVE,
                params(org, window, today), (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
        Object[] done = completed(org, window, today);
        Object[] before = completed(org, window.previous(), today);
        long completedNow = (Long) done[0];
        BigDecimal avg = done[2] == null ? null : ((BigDecimal) done[2]).setScale(1, RoundingMode.HALF_UP);

        List<StatusCount> byStatus = jdbc.query(
                "SELECT p.status, " + ProjectSql.STATUS_NAME + ", " + ProjectSql.STATUS_ORDER + ", "
                        + "(" + ProjectSql.DONE + " OR " + ProjectSql.CANCELLED + "), count(*) "
                        + FROM_PROJECTS + "WHERE " + LIVE + " GROUP BY 1, 2, 3, 4 ORDER BY 3, 2",
                params(org, window, today), (rs, n) -> new StatusCount(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getBoolean(4), rs.getLong(5)));

        List<DelayedProject> delayed = jdbc.query(
                "SELECT p.id, p.project_number, p.title, p.customer_name, p.project_manager_name, :today - p.expected_completion_date, p.progress_percentage "
                        + FROM_PROJECTS + "WHERE " + LIVE + " AND " + ACTIVE + " AND p.expected_completion_date < :today "
                        + "ORDER BY :today - p.expected_completion_date DESC LIMIT 5",
                params(org, window, today),
                (rs, n) -> new DelayedProject(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getLong(6), rs.getInt(7)));

        return new ProjectsOverview(now[0], now[1], new CountCompared(completedNow, (Long) before[0]),
                percent((Long) done[1], completedNow), avg, byStatus, delayed);
    }

    // ---------------------------------------------------------------- dashboard extras

    /** The projects whose cost is worth comparing: still running, or completed in the period. Largest expected cost first. */
    public List<CostRow> costComparison(UUID org, Window window, LocalDate today, int limit) {
        String cost = FinanceMetrics.PROJECT_COST;
        String expected = "(CASE WHEN coalesce(p.expected_cost, 0) > 0 THEN p.expected_cost WHEN coalesce(p.budget, 0) > 0 THEN p.budget ELSE " + cost + " END)";
        return jdbc.query(
                "SELECT p.id, p.project_number, p.title, " + expected + " AS expected, " + cost + " AS actual, p.progress_percentage "
                        + FROM_PROJECTS + "WHERE " + LIVE + " AND (" + ACTIVE + " OR (" + DONE + " AND p.actual_completion_date BETWEEN :from AND :to)) "
                        + "ORDER BY expected DESC LIMIT :limit",
                params(org, window, today).addValue("limit", limit),
                (rs, n) -> new CostRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), money(rs.getBigDecimal(4)), money(rs.getBigDecimal(5)), rs.getInt(6)));
    }

    /** {expected total, recorded total} over the same projects as {@link #costComparison}. */
    public BigDecimal[] costTotals(UUID org, Window window, LocalDate today) {
        String cost = FinanceMetrics.PROJECT_COST;
        String expected = "(CASE WHEN coalesce(p.expected_cost, 0) > 0 THEN p.expected_cost WHEN coalesce(p.budget, 0) > 0 THEN p.budget ELSE " + cost + " END)";
        return jdbc.queryForObject(
                "SELECT coalesce(sum(" + expected + "), 0), coalesce(sum(" + cost + "), 0) " + FROM_PROJECTS
                        + "WHERE " + LIVE + " AND (" + ACTIVE + " OR (" + DONE + " AND p.actual_completion_date BETWEEN :from AND :to))",
                params(org, window, today), (rs, n) -> new BigDecimal[] {money(rs.getBigDecimal(1)), money(rs.getBigDecimal(2))});
    }

    /** Projects completed per bucket, split into those that finished by their expected date and those that did not. */
    public List<DeliveryBucket> deliveryTrend(UUID org, Window window, LocalDate today) {
        String unit = window.granularity().truncUnit();
        String step = window.granularity().step();
        return jdbc.query(
                "WITH buckets AS (SELECT g::date AS bucket FROM generate_series(date_trunc('" + unit + "', CAST(:from AS timestamp)), CAST(:to AS timestamp), interval '" + step + "') g), "
                        + "done AS (SELECT date_trunc('" + unit + "', CAST(p.actual_completion_date AS timestamp))::date AS bucket, "
                        + "  count(*) FILTER (WHERE p.actual_completion_date <= p.expected_completion_date) AS on_time, "
                        + "  count(*) FILTER (WHERE p.actual_completion_date > p.expected_completion_date) AS late "
                        + FROM_PROJECTS + "WHERE " + LIVE + " AND " + DONE + " AND p.actual_completion_date BETWEEN :from AND :to GROUP BY 1) "
                        + "SELECT b.bucket, coalesce(done.on_time, 0), coalesce(done.late, 0) FROM buckets b LEFT JOIN done ON done.bucket = b.bucket ORDER BY b.bucket",
                params(org, window, today), (rs, n) -> new DeliveryBucket(rs.getObject(1, LocalDate.class), rs.getLong(2), rs.getLong(3)));
    }

    /** Milestones of running projects that are overdue or due in the next 30 days, soonest first. */
    public List<MilestoneRow> upcomingMilestones(UUID org, LocalDate today, int limit) {
        return jdbc.query(
                "SELECT p.id, p.title, m.title, m.due_date, m.status, m.due_date - :today "
                        + "FROM project_milestones m JOIN projects p ON p.id = m.project_id " + ProjectSql.JOIN_STATUS
                        + "WHERE " + LIVE + " AND " + ACTIVE + " AND m.status <> 'COMPLETED' AND m.due_date <= :today + 30 ORDER BY m.due_date LIMIT :limit",
                new MapSqlParameterSource("org", org).addValue("today", today).addValue("limit", limit),
                (rs, n) -> new MilestoneRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getObject(4, LocalDate.class), rs.getString(5), rs.getLong(6)));
    }
}
