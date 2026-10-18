package com.pawanputra.bos.ask.internal;

import com.pawanputra.bos.ask.api.AskTool;
import com.pawanputra.bos.ask.internal.AskResponse.AskRecord;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Answers the known questions from the live records. Each question needs the permission of the module it reads
 * (projects, invoices, leads, contracts, activities, tickets): holding ASK_VIEW opens the feature, it does not open the
 * data. A person who may not see a kind of record is told so and given nothing from it. Counts are real counts; the
 * records listed are the first ten.
 */
@Service
@Transactional(readOnly = true)
public class AskToolExecutor {

    private static final int LIST = 10;
    private static final Locale INDIA = Locale.of("en", "IN");

    /** A question that can be asked, as shown to the person (the question text is also what the matcher understands). */
    public record Suggestion(String tool, String question) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final ZoneId zone;
    private final GeminiAiService geminiAiService;

    AskToolExecutor(
            NamedParameterJdbcTemplate jdbc,
            Clock clock,
            @Value("${app.finance.time-zone:Asia/Kolkata}") String zone,
            GeminiAiService geminiAiService) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
        this.geminiAiService = geminiAiService;
    }

    private static boolean canUse(AskTool tool, CurrentUser user) {
        return switch (tool) {
            case GET_DELAYED_PROJECTS -> user.hasPermission(Permissions.PROJECT_VIEW);
            case GET_OVERDUE_INVOICES -> user.hasPermission(Permissions.FINANCE_VIEW) || user.hasPermission(Permissions.RECEIVABLES_VIEW);
            case GET_LEADS_PIPELINE -> user.hasPermission(Permissions.LEAD_VIEW);
            case GET_EXPIRING_AMCS -> user.hasPermission(Permissions.AMC_VIEW);
            case GET_TODAYS_TASKS -> user.hasPermission(Permissions.ACTIVITY_VIEW);
            case GET_OPEN_TICKETS -> user.hasPermission(Permissions.TICKET_VIEW);
            case GET_MONEY_THIS_MONTH -> user.hasPermission(Permissions.FINANCE_VIEW);
            case GET_PIPELINE_VALUE -> user.hasPermission(Permissions.OPPORTUNITY_VIEW);
            case UNKNOWN -> true;
        };
    }

    private static String needs(AskTool tool) {
        return switch (tool) {
            case GET_DELAYED_PROJECTS -> "projects";
            case GET_OVERDUE_INVOICES, GET_MONEY_THIS_MONTH -> "invoices and payments";
            case GET_LEADS_PIPELINE -> "leads";
            case GET_EXPIRING_AMCS -> "AMC contracts";
            case GET_TODAYS_TASKS -> "activities and tasks";
            case GET_OPEN_TICKETS -> "support tickets";
            case GET_PIPELINE_VALUE -> "opportunities";
            case UNKNOWN -> "";
        };
    }

    private static String questionOf(AskTool tool) {
        return switch (tool) {
            case GET_DELAYED_PROJECTS -> "Which projects are delayed?";
            case GET_OVERDUE_INVOICES -> "Which invoices are overdue?";
            case GET_LEADS_PIPELINE -> "Show open leads";
            case GET_EXPIRING_AMCS -> "Which AMC contracts expire soon?";
            case GET_TODAYS_TASKS -> "What are my tasks today?";
            case GET_OPEN_TICKETS -> "Show open support tickets";
            case GET_MONEY_THIS_MONTH -> "How much did we invoice and collect this month?";
            case GET_PIPELINE_VALUE -> "What is the value of our open deals?";
            case UNKNOWN -> "";
        };
    }

    /** The questions this person can ask (those whose data they may see). */
    public List<Suggestion> suggestions(CurrentUser user) {
        return Arrays.stream(AskTool.values())
                .filter(tool -> tool != AskTool.UNKNOWN && canUse(tool, user))
                .map(tool -> new Suggestion(tool.name(), questionOf(tool)))
                .toList();
    }

    public AskResponse execute(AskTool tool, String question, CurrentUser user) {
        if (tool == AskTool.UNKNOWN) {
            if (geminiAiService != null && geminiAiService.isEnabled()) {
                return geminiAiService.generateAnswer(question, user);
            }
            return new AskResponse(question, "I did not understand that. Try one of the questions below.",
                    "Ask PAWAN answers a fixed set of questions about your data; it does not interpret free text.", List.of(), 0, null, null);
        }
        if (!canUse(tool, user)) {
            return new AskResponse(question, "I cannot answer that: your role does not include access to " + needs(tool) + ".",
                    "Answers only use records you are allowed to see.", List.of(), 0, null, null);
        }
        LocalDate today = LocalDate.now(clock.withZone(zone));
        OffsetDateTime dayStart = today.atStartOfDay(zone).toOffsetDateTime();
        MapSqlParameterSource p = new MapSqlParameterSource()
                .addValue("org", user.organizationId())
                .addValue("user", user.id())
                .addValue("today", today)
                .addValue("monthStart", today.withDayOfMonth(1))
                .addValue("dayStart", dayStart)
                .addValue("dayEnd", dayStart.plusDays(1))
                .addValue("limit", LIST);
        return switch (tool) {
            case GET_DELAYED_PROJECTS -> delayedProjects(question, p);
            case GET_OVERDUE_INVOICES -> overdueInvoices(question, p);
            case GET_LEADS_PIPELINE -> openLeads(question, p);
            case GET_EXPIRING_AMCS -> expiringContracts(question, p);
            case GET_TODAYS_TASKS -> todaysTasks(question, p);
            case GET_OPEN_TICKETS -> openTickets(question, p);
            case GET_MONEY_THIS_MONTH -> moneyThisMonth(question, p);
            case GET_PIPELINE_VALUE -> pipelineValue(question, p);
            case UNKNOWN -> throw new IllegalStateException();
        };
    }

    // ------------------------------------------------------------------ helpers

    private static String inr(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(INDIA).format(amount == null ? BigDecimal.ZERO : amount);
    }

    private long count(String sql, MapSqlParameterSource p) {
        Long value = jdbc.queryForObject(sql, p, Long.class);
        return value == null ? 0 : value;
    }

    private List<AskRecord> records(String sql, MapSqlParameterSource p, RowMapper<AskRecord> mapper) {
        return jdbc.query(sql, p, mapper);
    }

    private static String plural(long n, String one, String many) {
        return n + " " + (n == 1 ? one : many);
    }

    // ------------------------------------------------------------------ questions

    private AskResponse delayedProjects(String question, MapSqlParameterSource p) {
        String where = "FROM projects p LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status "
                + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND NOT coalesce(ps.is_completed, p.status = 'COMPLETED') AND NOT coalesce(ps.is_cancelled, p.status = 'CANCELLED') "
                + "AND p.expected_completion_date < :today";
        long total = count("SELECT count(*) " + where, p);
        List<AskRecord> rows = records("SELECT p.id, p.project_number, p.title, p.customer_name, :today - p.expected_completion_date, p.progress_percentage " + where
                + " ORDER BY p.expected_completion_date LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2) + " – " + rs.getString(3), rs.getString(4) + " · " + rs.getLong(5) + " days late, " + rs.getInt(6) + "% done", "/projects/" + rs.getString(1)));
        return new AskResponse(question, total == 0 ? "No projects are past their expected completion date." : plural(total, "project is", "projects are") + " past the expected completion date.",
                "Running projects whose expected completion date is before today, oldest first.", rows, total, "Review the delayed projects", "/projects");
    }

    private AskResponse overdueInvoices(String question, MapSqlParameterSource p) {
        String owing = "(i.total + i.debit_total - i.credit_total - i.amount_paid)";
        String where = "FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date < :today";
        Object[] totals = jdbc.queryForObject("SELECT count(*), coalesce(sum(" + owing + "), 0) " + where, p, (rs, i) -> new Object[] {rs.getLong(1), rs.getBigDecimal(2)});
        List<AskRecord> rows = records("SELECT i.id, i.invoice_number, i.customer_name, " + owing + ", :today - i.due_date " + where + " ORDER BY i.due_date LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2) + " – " + rs.getString(3), inr(rs.getBigDecimal(4)) + " owing · " + rs.getLong(5) + " days overdue", "/invoices/" + rs.getString(1)));
        long total = (Long) totals[0];
        return new AskResponse(question, total == 0 ? "No invoices are overdue." : plural(total, "invoice is", "invoices are") + " overdue, with " + inr((BigDecimal) totals[1]) + " still owing.",
                "Issued invoices with money outstanding and a due date before today, oldest first.", rows, total, "Open the overdue receivables", "/receivables/overdue");
    }

    private AskResponse openLeads(String question, MapSqlParameterSource p) {
        String where = "FROM leads l WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.status = 'OPEN'";
        long total = count("SELECT count(*) " + where, p);
        List<AskRecord> rows = records("SELECT l.id, l.contact_name, l.company_name, l.score, l.priority " + where + " ORDER BY l.score DESC LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2), (rs.getString(3) == null ? "" : rs.getString(3) + " · ") + "score " + rs.getInt(4) + " · " + rs.getString(5).toLowerCase() + " priority", "/leads/" + rs.getString(1)));
        return new AskResponse(question, total == 0 ? "There are no open leads." : plural(total, "lead is", "leads are") + " open.",
                "Leads that are neither won nor lost, best score first.", rows, total, "Open the leads list", "/leads");
    }

    private AskResponse expiringContracts(String question, MapSqlParameterSource p) {
        String where = "FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id WHERE a.organization_id = :org AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') "
                + "AND a.end_date BETWEEN :today AND :today + 60";
        long total = count("SELECT count(*) " + where, p);
        List<AskRecord> rows = records("SELECT a.id, a.contract_number, c.display_name, a.end_date, a.contract_value " + where + " ORDER BY a.end_date LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2) + " – " + rs.getString(3), "ends " + rs.getObject(4, LocalDate.class) + " · " + inr(rs.getBigDecimal(5)), "/amc-contracts/" + rs.getString(1)));
        return new AskResponse(question, total == 0 ? "No AMC contracts end in the next 60 days." : plural(total, "AMC contract ends", "AMC contracts end") + " in the next 60 days.",
                "Contracts in force whose end date falls within 60 days, soonest first.", rows, total, "Open AMC contracts", "/amc-contracts");
    }

    private AskResponse todaysTasks(String question, MapSqlParameterSource p) {
        String where = "FROM activities a WHERE a.organization_id = :org AND a.owner_id = :user AND a.deleted_at IS NULL AND a.status IN ('PENDING', 'IN_PROGRESS') AND a.due_date >= :dayStart AND a.due_date < :dayEnd";
        long total = count("SELECT count(*) " + where, p);
        List<AskRecord> rows = records("SELECT a.id, a.title, a.type, a.entity_name " + where + " ORDER BY a.due_date LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2), rs.getString(3).toLowerCase().replace('_', ' ') + (rs.getString(4) == null ? "" : " · " + rs.getString(4)), "/activities"));
        return new AskResponse(question, total == 0 ? "You have nothing due today." : "You have " + plural(total, "task", "tasks") + " due today.",
                "Your own activities and follow-ups that are not done and fall due today.", rows, total, "Open my activities", "/activities");
    }

    private AskResponse openTickets(String question, MapSqlParameterSource p) {
        String where = "FROM tickets t WHERE t.organization_id = :org AND t.status NOT IN ('RESOLVED', 'CLOSED')";
        long total = count("SELECT count(*) " + where, p);
        List<AskRecord> rows = records("SELECT t.id, t.ticket_number, t.subject, t.customer_name, t.priority " + where + " ORDER BY t.due_at NULLS LAST LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2) + " – " + rs.getString(3), rs.getString(4) + " · " + rs.getString(5).toLowerCase() + " priority", "/support/tickets/" + rs.getString(1)));
        return new AskResponse(question, total == 0 ? "There are no open tickets." : plural(total, "ticket is", "tickets are") + " open.",
                "Tickets that are not resolved or closed, those closest to (or past) their SLA time first.", rows, total, "Open the support desk", "/support/tickets");
    }

    private AskResponse moneyThisMonth(String question, MapSqlParameterSource p) {
        BigDecimal invoiced = jdbc.queryForObject("SELECT coalesce(sum(i.total), 0) FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL "
                + "AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID') AND i.issue_date BETWEEN :monthStart AND :today", p, BigDecimal.class);
        BigDecimal collected = jdbc.queryForObject("SELECT coalesce(sum(pay.amount), 0) FROM payments pay WHERE pay.organization_id = :org AND pay.status = 'RECEIVED' "
                + "AND pay.received_on BETWEEN :monthStart AND :today", p, BigDecimal.class);
        List<AskRecord> rows = new ArrayList<>();
        rows.add(new AskRecord("invoiced", "Invoiced", inr(invoiced), "/invoices"));
        rows.add(new AskRecord("collected", "Collected", inr(collected), "/payments"));
        return new AskResponse(question, "This month so far: " + inr(invoiced) + " invoiced and " + inr(collected) + " collected.",
                "Invoices issued (cancelled ones left out) and payments received (reversed ones left out) since the 1st.", rows, rows.size(), "Open the receivables dashboard", "/receivables");
    }

    private AskResponse pipelineValue(String question, MapSqlParameterSource p) {
        Object[] row = jdbc.queryForObject("SELECT count(*), coalesce(sum(o.value), 0), coalesce(sum(o.value * o.probability / 100.0), 0) FROM opportunities o "
                + "WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'OPEN'", p, (rs, i) -> new Object[] {rs.getLong(1), rs.getBigDecimal(2), rs.getBigDecimal(3)});
        List<AskRecord> rows = records("SELECT o.id, o.title, o.customer_name, o.value, o.probability FROM opportunities o WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'OPEN' "
                + "ORDER BY o.value DESC LIMIT :limit", p, (rs, i) -> new AskRecord(rs.getString(1), rs.getString(2), (rs.getString(3) == null ? "" : rs.getString(3) + " · ") + inr(rs.getBigDecimal(4)) + " at " + rs.getInt(5) + "%", "/opportunities"));
        long total = (Long) row[0];
        return new AskResponse(question, total == 0 ? "There are no open deals." : plural(total, "deal is", "deals are") + " open, worth " + inr((BigDecimal) row[1]) + " (" + inr((BigDecimal) row[2]) + " weighted by probability).",
                "Opportunities that are neither won nor lost; weighted value is each deal's value times its win probability.", rows, total, "Open the pipeline", "/opportunities");
    }
}
