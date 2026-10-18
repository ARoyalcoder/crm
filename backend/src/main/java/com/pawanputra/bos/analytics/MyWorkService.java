package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.AssignedProject;
import com.pawanputra.bos.analytics.AnalyticsModels.CollectionRow;
import com.pawanputra.bos.analytics.AnalyticsModels.CollectionWork;
import com.pawanputra.bos.analytics.AnalyticsModels.JobRow;
import com.pawanputra.bos.analytics.AnalyticsModels.Jobs;
import com.pawanputra.bos.analytics.AnalyticsModels.MyTickets;
import com.pawanputra.bos.analytics.AnalyticsModels.MyWork;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectTaskRow;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectTasks;
import com.pawanputra.bos.analytics.AnalyticsModels.TargetProgress;
import com.pawanputra.bos.analytics.AnalyticsModels.Targets;
import com.pawanputra.bos.analytics.AnalyticsModels.TaskRow;
import com.pawanputra.bos.analytics.AnalyticsModels.Tasks;
import com.pawanputra.bos.analytics.AnalyticsModels.TicketRow;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.performance.api.PersonalTargets;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The signed-in person's own day: their tasks and follow-ups, the projects and project tasks they are on,
 * their field jobs, tickets and collection calls, and their targets this month. Everything is scoped to
 * the caller; nobody sees another person's work here. A block appears only when the caller may use the
 * module it comes from, so a technician gets jobs and tasks and a sales executive gets follow-ups.
 */
@Service
@Transactional(readOnly = true)
public class MyWorkService {

    private static final int ITEMS = 8;

    private static final String ACTIVE_PROJECT = "NOT coalesce(ps.is_completed, p.status = 'COMPLETED') AND NOT coalesce(ps.is_cancelled, p.status = 'CANCELLED')";
    private static final String PROJECT_STATUS = "LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status";
    private static final String OPEN_TICKET = "t.status NOT IN ('RESOLVED', 'CLOSED')";

    private final NamedParameterJdbcTemplate jdbc;
    private final BusinessCalendar calendar;
    private final Clock clock;
    private final PersonalTargets personalTargets;

    MyWorkService(NamedParameterJdbcTemplate jdbc, BusinessCalendar calendar, Clock clock, PersonalTargets personalTargets) {
        this.jdbc = jdbc;
        this.calendar = calendar;
        this.clock = clock;
        this.personalTargets = personalTargets;
    }

    public MyWork myWork(CurrentUser user) {
        LocalDate today = calendar.today();
        ZoneId zone = calendar.zone();
        OffsetDateTime dayStart = today.atStartOfDay(zone).toOffsetDateTime();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("org", user.organizationId())
                .addValue("user", user.id())
                .addValue("today", today)
                .addValue("dayStart", dayStart)
                .addValue("dayEnd", dayStart.plusDays(1))
                .addValue("weekEnd", dayStart.plusDays(8))
                .addValue("weekAgo", dayStart.minusDays(6))
                .addValue("now", OffsetDateTime.now(clock))
                .addValue("limit", ITEMS);

        String name = jdbc.query("SELECT full_name FROM users WHERE id = :user", p, rs -> rs.next() ? rs.getString(1) : null);

        boolean projects = user.hasPermission(Permissions.PROJECT_VIEW);
        return new MyWork(
                user.id(), name, today,
                user.hasPermission(Permissions.ACTIVITY_VIEW) ? tasks(p) : null,
                projects ? projectTasks(p) : null,
                projects ? assignedProjects(p) : null,
                user.hasPermission(Permissions.FIELD_JOB_WORK) ? jobs(p) : null,
                user.hasPermission(Permissions.TICKET_VIEW) ? tickets(p) : null,
                user.hasPermission(Permissions.RECEIVABLES_VIEW) ? collections(p) : null,
                targets(user, today));
    }

    private Tasks tasks(MapSqlParameterSource p) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE a.status IN ('PENDING', 'IN_PROGRESS') AND a.due_date >= :dayStart AND a.due_date < :dayEnd), "
                        + "count(*) FILTER (WHERE a.status IN ('PENDING', 'IN_PROGRESS') AND a.due_date < :dayStart), "
                        + "count(*) FILTER (WHERE a.status IN ('PENDING', 'IN_PROGRESS') AND a.due_date >= :dayEnd AND a.due_date < :weekEnd), "
                        + "count(*) FILTER (WHERE a.status = 'COMPLETED' AND a.completed_at >= :weekAgo) "
                        + "FROM activities a WHERE a.organization_id = :org AND a.owner_id = :user AND a.deleted_at IS NULL",
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4)});
        List<TaskRow> items = jdbc.query(
                "SELECT a.id, a.title, a.type, a.priority, a.status, a.due_date, a.due_date < :dayStart, a.entity_type, a.entity_id, a.entity_name "
                        + "FROM activities a WHERE a.organization_id = :org AND a.owner_id = :user AND a.deleted_at IS NULL AND a.status IN ('PENDING', 'IN_PROGRESS') "
                        + "ORDER BY a.due_date NULLS LAST LIMIT :limit",
                p, (rs, n) -> new TaskRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getObject(6, OffsetDateTime.class) == null ? null : rs.getObject(6, OffsetDateTime.class).toInstant(), rs.getBoolean(7),
                        rs.getString(8), rs.getObject(9, UUID.class), rs.getString(10)));
        return new Tasks(counts[0], counts[1], counts[2], counts[3], items);
    }

    private ProjectTasks projectTasks(MapSqlParameterSource p) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*), count(*) FILTER (WHERE t.due_date < :today) FROM project_tasks t JOIN projects p ON p.id = t.project_id " + PROJECT_STATUS + " "
                        + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND " + ACTIVE_PROJECT + " AND t.assigned_to_id = :user AND t.status IN ('TODO', 'IN_PROGRESS', 'BLOCKED')",
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
        List<ProjectTaskRow> items = jdbc.query(
                "SELECT t.id, t.title, p.id, p.title, t.due_date, t.status, t.priority, coalesce(t.due_date < :today, false) "
                        + "FROM project_tasks t JOIN projects p ON p.id = t.project_id " + PROJECT_STATUS + " "
                        + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND " + ACTIVE_PROJECT + " AND t.assigned_to_id = :user AND t.status IN ('TODO', 'IN_PROGRESS', 'BLOCKED') "
                        + "ORDER BY t.due_date NULLS LAST LIMIT :limit",
                p, (rs, n) -> new ProjectTaskRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getObject(3, UUID.class), rs.getString(4),
                        rs.getObject(5, LocalDate.class), rs.getString(6), rs.getString(7), rs.getBoolean(8)));
        return new ProjectTasks(counts[0], counts[1], items);
    }

    private List<AssignedProject> assignedProjects(MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT p.id, p.project_number, p.title, p.customer_name, coalesce(ps.name, initcap(replace(lower(p.status), '_', ' '))), p.progress_percentage, p.expected_completion_date, "
                        + "p.expected_completion_date - :today, CASE WHEN p.project_manager_id = :user THEN 'MANAGER' ELSE 'MEMBER' END "
                        + "FROM projects p " + PROJECT_STATUS + " WHERE p.organization_id = :org AND p.deleted_at IS NULL AND " + ACTIVE_PROJECT + " "
                        + "AND (p.project_manager_id = :user OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = :user)) "
                        + "ORDER BY p.expected_completion_date LIMIT :limit",
                p, (rs, n) -> new AssignedProject(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getInt(6), rs.getObject(7, LocalDate.class), rs.getLong(8), rs.getString(9)));
    }

    private Jobs jobs(MapSqlParameterSource p) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE j.scheduled_start >= :dayStart AND j.scheduled_start < :dayEnd), count(*) FILTER (WHERE j.scheduled_start >= :dayEnd) "
                        + "FROM field_jobs j WHERE j.organization_id = :org AND j.technician_id = :user AND j.deleted_at IS NULL AND j.status NOT IN ('COMPLETED', 'CUSTOMER_CONFIRMED', 'CANCELLED')",
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
        List<JobRow> items = jdbc.query(
                "SELECT j.id, j.job_number, j.title, j.customer_name, j.scheduled_start, j.status FROM field_jobs j "
                        + "WHERE j.organization_id = :org AND j.technician_id = :user AND j.deleted_at IS NULL AND j.status NOT IN ('COMPLETED', 'CUSTOMER_CONFIRMED', 'CANCELLED') "
                        + "ORDER BY j.scheduled_start LIMIT :limit",
                p, (rs, n) -> new JobRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getObject(5, OffsetDateTime.class).toInstant(), rs.getString(6)));
        return new Jobs(counts[0], counts[1], items);
    }

    private MyTickets tickets(MapSqlParameterSource p) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.due_at < :now) FROM tickets t "
                        + "WHERE t.organization_id = :org AND t.assigned_user_id = :user AND " + OPEN_TICKET,
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
        List<TicketRow> items = jdbc.query(
                "SELECT t.id, t.ticket_number, t.subject, t.customer_name, t.priority, t.status, t.due_at, coalesce(t.due_at < :now, false) FROM tickets t "
                        + "WHERE t.organization_id = :org AND t.assigned_user_id = :user AND " + OPEN_TICKET + " ORDER BY t.due_at NULLS LAST LIMIT :limit",
                p, (rs, n) -> new TicketRow(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6),
                        rs.getObject(7, OffsetDateTime.class) == null ? null : rs.getObject(7, OffsetDateTime.class).toInstant(), rs.getBoolean(8)));
        return new MyTickets(counts[0], counts[1], items);
    }

    private CollectionWork collections(MapSqlParameterSource p) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*), count(*) FILTER (WHERE c.due_date < :today) FROM collection_tasks c "
                        + "WHERE c.organization_id = :org AND c.assigned_to_user_id = :user AND c.status IN ('OPEN', 'IN_PROGRESS')",
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
        List<CollectionRow> items = jdbc.query(
                "SELECT c.id, i.id, i.invoice_number, i.customer_name, (i.total + i.debit_total - i.credit_total - i.amount_paid), c.due_date, c.priority, c.status "
                        + "FROM collection_tasks c JOIN invoices i ON i.id = c.invoice_id WHERE c.organization_id = :org AND c.assigned_to_user_id = :user AND c.status IN ('OPEN', 'IN_PROGRESS') "
                        + "ORDER BY c.due_date NULLS LAST LIMIT :limit",
                p, (rs, n) -> new CollectionRow(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4),
                        rs.getBigDecimal(5).setScale(2, RoundingMode.HALF_UP), rs.getObject(6, LocalDate.class), rs.getString(7), rs.getString(8)));
        return new CollectionWork(counts[0], counts[1], items);
    }

    /** The user's own monthly targets. Null when they have none (the page then says nothing rather than showing an empty box). */
    private Targets targets(CurrentUser user, LocalDate today) {
        List<TargetProgress> items = personalTargets.monthlyTargets(user.organizationId(), user.id(), today).stream()
                .map(t -> new TargetProgress(t.type().name(), label(t.type().name()), t.target(), t.actual(), t.achievementPct(), t.tracked()))
                .toList();
        return items.isEmpty() ? null : new Targets(today.getYear(), today.getMonthValue(), items);
    }

    private static String label(String type) {
        return switch (type) {
            case "SALES_REVENUE" -> "Sales revenue";
            case "COLLECTION_AMOUNT" -> "Collections";
            case "PROJECT_COMPLETION" -> "Projects completed";
            case "FOLLOW_UP_COUNT" -> "Follow-ups completed";
            case "CUSTOMER_SATISFACTION" -> "Customer satisfaction";
            case "ORDER_COUNT" -> "Orders";
            case "LEAD_CONVERSION" -> "Lead conversion";
            default -> type;
        };
    }

}
