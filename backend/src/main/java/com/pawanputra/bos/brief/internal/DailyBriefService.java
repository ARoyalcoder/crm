package com.pawanputra.bos.brief.internal;

import com.pawanputra.bos.brief.api.BriefRole;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The morning brief: what needs attention today, built from the live records.
 *
 * <p>What a person is told depends on what they may see, not on a guess from their role's name: leads need
 * LEAD_VIEW, invoices FINANCE_VIEW (or RECEIVABLES_VIEW), projects PROJECT_VIEW, tickets TICKET_VIEW, contracts
 * AMC_VIEW, follow-ups ACTIVITY_VIEW. A section is left out when the caller may not see its source; "today" is the
 * business day, and every count is a real count (lists show the first few, the figure says how many there are).
 */
@Service
@Transactional(readOnly = true)
public class DailyBriefService {

    private static final int LIST = 5;
    private static final Locale INDIA = Locale.of("en", "IN");
    private static final String ACTIVE_PROJECT = "NOT coalesce(ps.is_completed, p.status = 'COMPLETED') AND NOT coalesce(ps.is_cancelled, p.status = 'CANCELLED')";
    private static final String PROJECT_STATUS = "LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status";
    private static final String OUTSTANDING = "(i.total + i.debit_total - i.credit_total - i.amount_paid)";

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final ZoneId zone;

    DailyBriefService(NamedParameterJdbcTemplate jdbc, Clock clock, @Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    public BriefResponse generate(CurrentUser user) {
        LocalDate today = LocalDate.now(clock.withZone(zone));
        OffsetDateTime dayStart = today.atStartOfDay(zone).toOffsetDateTime();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("org", user.organizationId())
                .addValue("user", user.id())
                .addValue("today", today)
                .addValue("monthStart", today.withDayOfMonth(1))
                .addValue("dayStart", dayStart)
                .addValue("dayEnd", dayStart.plusDays(1))
                .addValue("now", OffsetDateTime.now(clock))
                .addValue("limit", LIST);

        boolean money = user.hasPermission(Permissions.FINANCE_VIEW) || user.hasPermission(Permissions.RECEIVABLES_VIEW);
        List<BriefSection> sections = new ArrayList<>();
        if (user.hasPermission(Permissions.ACTIVITY_VIEW)) {
            sections.add(new BriefSection("Your follow-ups due today", "calendar", followUps(p)));
        }
        if (user.hasPermission(Permissions.LEAD_VIEW)) {
            sections.add(new BriefSection("Hot leads", "target", hotLeads(p)));
        }
        if (user.hasPermission(Permissions.FINANCE_VIEW)) {
            sections.add(new BriefSection("This month's money", "trending-up", monthMoney(p)));
        }
        if (money) {
            sections.add(new BriefSection("Overdue invoices", "alert-circle", overdueInvoices(p)));
            sections.add(new BriefSection("Falling due in the next 7 days", "clock", dueSoon(p)));
        }
        if (user.hasPermission(Permissions.PROJECT_VIEW)) {
            sections.add(new BriefSection("Your project tasks due today", "list-checks", projectTasks(p)));
            sections.add(new BriefSection("Delayed projects", "alert-triangle", delayedProjects(p)));
        }
        if (user.hasPermission(Permissions.TICKET_VIEW)) {
            sections.add(new BriefSection("Support tickets", "headphones", tickets(p)));
        }
        if (user.hasPermission(Permissions.AMC_VIEW)) {
            sections.add(new BriefSection("AMC contracts ending soon", "shield", contractsEndingSoon(p)));
        }
        BriefRole role = lens(user);
        return new BriefResponse(role, greeting(role), sections, today);
    }

    /** The viewpoint of the brief, from what the person can see. Only used for the greeting. */
    private static BriefRole lens(CurrentUser user) {
        boolean finance = user.hasPermission(Permissions.FINANCE_VIEW);
        boolean projects = user.hasPermission(Permissions.PROJECT_VIEW);
        boolean sales = user.hasPermission(Permissions.LEAD_VIEW) || user.hasPermission(Permissions.OPPORTUNITY_VIEW);
        if (finance && projects && sales) {
            return BriefRole.DIRECTOR;
        }
        if (finance) {
            return BriefRole.FINANCE;
        }
        if (projects && !sales) {
            return BriefRole.PROJECT_MANAGER;
        }
        if (sales) {
            return BriefRole.SALESPERSON;
        }
        return BriefRole.DIRECTOR;
    }

    private static String greeting(BriefRole role) {
        return switch (role) {
            case SALESPERSON -> "Good morning! Here is your sales brief for today.";
            case PROJECT_MANAGER -> "Good morning! Here is your project brief for today.";
            case FINANCE -> "Good morning! Here is your finance brief for today.";
            case DIRECTOR -> "Good morning! Here is your executive brief for today.";
        };
    }

    private static String inr(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(INDIA).format(amount == null ? BigDecimal.ZERO : amount);
    }

    private long count(String sql, MapSqlParameterSource p) {
        Long value = jdbc.queryForObject(sql, p, Long.class);
        return value == null ? 0 : value;
    }

    // ------------------------------------------------------------------ sections

    private List<BriefItem> followUps(MapSqlParameterSource p) {
        String where = "FROM activities a WHERE a.organization_id = :org AND a.owner_id = :user AND a.deleted_at IS NULL "
                + "AND a.status IN ('PENDING', 'IN_PROGRESS') AND a.due_date >= :dayStart AND a.due_date < :dayEnd";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query("SELECT a.id, a.title, a.entity_name " + where + " ORDER BY a.due_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("Follow-up", rs.getString(2), rs.getString(3) == null ? "Due today" : "For " + rs.getString(3), "/activities",
                        "This task is due today and not yet done."));
        return withTotal(total, "follow-ups due today", "/activities", items);
    }

    private List<BriefItem> hotLeads(MapSqlParameterSource p) {
        String where = "FROM leads l WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.status = 'OPEN' AND l.score >= 60";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query("SELECT l.id, l.contact_name, l.company_name, l.score " + where + " ORDER BY l.score DESC LIMIT :limit", p,
                (rs, i) -> new BriefItem("Lead", rs.getString(2), (rs.getString(3) == null ? "" : rs.getString(3) + " · ") + "score " + rs.getInt(4),
                        "/leads/" + rs.getString(1), "An open lead with a score of 60 or more is worth a call today."));
        return withTotal(total, "open leads scoring 60 or more", "/leads", items);
    }

    /** Invoiced and collected so far this month, the same way the finance screens count them. */
    private List<BriefItem> monthMoney(MapSqlParameterSource p) {
        BigDecimal invoiced = jdbc.queryForObject(
                "SELECT coalesce(sum(i.total), 0) FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID') "
                        + "AND i.issue_date BETWEEN :monthStart AND :today", p, BigDecimal.class);
        BigDecimal collected = jdbc.queryForObject(
                "SELECT coalesce(sum(pay.amount), 0) FROM payments pay WHERE pay.organization_id = :org AND pay.status = 'RECEIVED' AND pay.received_on BETWEEN :monthStart AND :today",
                p, BigDecimal.class);
        return List.of(
                new BriefItem("Invoiced (month to date)", inr(invoiced), "Invoices issued this month", "/invoices", "Total of invoices issued since the 1st, cancelled ones left out."),
                new BriefItem("Collected (month to date)", inr(collected), "Payments received this month", "/payments", "Payments received since the 1st, reversed ones left out."));
    }

    private List<BriefItem> overdueInvoices(MapSqlParameterSource p) {
        String where = "FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date < :today";
        Object[] total = jdbc.queryForObject("SELECT count(*), coalesce(sum(" + OUTSTANDING + "), 0) " + where, p, (rs, i) -> new Object[] {rs.getLong(1), rs.getBigDecimal(2)});
        List<BriefItem> items = jdbc.query(
                "SELECT i.id, i.invoice_number, i.customer_name, " + OUTSTANDING + ", :today - i.due_date " + where + " ORDER BY i.due_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("Invoice", rs.getString(2), rs.getString(3) + " · " + inr(rs.getBigDecimal(4)) + " owing, " + rs.getLong(5) + " days late",
                        "/invoices/" + rs.getString(1), "This invoice is past its due date and not fully paid."));
        long n = (Long) total[0];
        List<BriefItem> result = new ArrayList<>();
        if (n > items.size()) {
            result.add(new BriefItem("Overdue", String.valueOf(n), inr((BigDecimal) total[1]) + " owing in all; the oldest are listed below", "/receivables/overdue", "Every invoice past its due date."));
        }
        result.addAll(items);
        return result;
    }

    private List<BriefItem> dueSoon(MapSqlParameterSource p) {
        String where = "FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date BETWEEN :today AND :today + 7";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query(
                "SELECT i.id, i.invoice_number, i.customer_name, " + OUTSTANDING + ", i.due_date " + where + " ORDER BY i.due_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("Invoice", rs.getString(2), rs.getString(3) + " · " + inr(rs.getBigDecimal(4)) + " due " + rs.getObject(5, LocalDate.class),
                        "/invoices/" + rs.getString(1), "Payment is due within the next 7 days."));
        return withTotal(total, "invoices falling due within 7 days", "/receivables/outstanding", items);
    }

    private List<BriefItem> projectTasks(MapSqlParameterSource p) {
        String where = "FROM project_tasks t JOIN projects p ON p.id = t.project_id " + PROJECT_STATUS + " WHERE p.organization_id = :org AND p.deleted_at IS NULL AND " + ACTIVE_PROJECT
                + " AND t.assigned_to_id = :user AND t.status IN ('TODO', 'IN_PROGRESS', 'BLOCKED') AND t.due_date <= :today";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query("SELECT t.id, t.title, p.title, p.id, t.due_date " + where + " ORDER BY t.due_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("Task", rs.getString(2), rs.getString(3) + (rs.getObject(5, LocalDate.class).isBefore(LocalDate.now(clock.withZone(zone))) ? " · overdue" : " · due today"),
                        "/projects/" + rs.getString(4), "This task is assigned to you and is due or overdue."));
        return withTotal(total, "of your project tasks are due or overdue", "/projects", items);
    }

    private List<BriefItem> delayedProjects(MapSqlParameterSource p) {
        String where = "FROM projects p " + PROJECT_STATUS + " WHERE p.organization_id = :org AND p.deleted_at IS NULL AND " + ACTIVE_PROJECT + " AND p.expected_completion_date < :today";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query(
                "SELECT p.id, p.title, p.customer_name, :today - p.expected_completion_date, p.progress_percentage " + where + " ORDER BY p.expected_completion_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("Project", rs.getString(2), rs.getString(3) + " · " + rs.getLong(4) + " days late at " + rs.getInt(5) + "%",
                        "/projects/" + rs.getString(1), "This project is past its expected completion date."));
        return withTotal(total, "projects past their expected date", "/projects", items);
    }

    private List<BriefItem> tickets(MapSqlParameterSource p) {
        Object[] counts = jdbc.queryForObject(
                "SELECT count(*), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.due_at < :now) FROM tickets t WHERE t.organization_id = :org AND t.status NOT IN ('RESOLVED', 'CLOSED')",
                p, (rs, i) -> new Object[] {rs.getLong(1), rs.getLong(2)});
        List<BriefItem> items = new ArrayList<>();
        items.add(new BriefItem("Open tickets", String.valueOf(counts[0]), counts[1] + " past their SLA time", "/support/tickets", "Tickets not yet resolved or closed."));
        items.addAll(jdbc.query(
                "SELECT t.id, t.ticket_number, t.subject, t.customer_name FROM tickets t WHERE t.organization_id = :org AND t.status NOT IN ('RESOLVED', 'CLOSED') AND t.due_at IS NOT NULL AND t.due_at < :now "
                        + "ORDER BY t.due_at LIMIT :limit", p,
                (rs, i) -> new BriefItem("Ticket", rs.getString(2), rs.getString(4) + " · " + rs.getString(3), "/support/tickets/" + rs.getString(1), "This ticket is past its SLA time.")));
        return items;
    }

    private List<BriefItem> contractsEndingSoon(MapSqlParameterSource p) {
        String where = "FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id WHERE a.organization_id = :org AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date BETWEEN :today AND :today + 30";
        long total = count("SELECT count(*) " + where, p);
        List<BriefItem> items = jdbc.query("SELECT a.id, a.contract_number, c.display_name, a.end_date " + where + " ORDER BY a.end_date LIMIT :limit", p,
                (rs, i) -> new BriefItem("AMC", rs.getString(2), rs.getString(3) + " · ends " + rs.getObject(4, LocalDate.class), "/amc-contracts/" + rs.getString(1),
                        "This contract ends within 30 days."));
        return withTotal(total, "contracts ending within 30 days", "/amc-contracts", items);
    }

    /** A real count first (when the list is only the top few of more), then the items. An empty section stays empty. */
    private static List<BriefItem> withTotal(long total, String what, String url, List<BriefItem> items) {
        if (total <= items.size()) {
            return items;
        }
        List<BriefItem> result = new ArrayList<>();
        result.add(new BriefItem("In all", String.valueOf(total), what, url, "The full count, not just the items listed."));
        result.addAll(items);
        return result;
    }

}
