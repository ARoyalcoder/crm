package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.pulse.api.PulseInsightCategory;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Risk Engine: things that could cost money, break an SLA or damage a relationship unless someone acts:
 * leads going cold, invoices long overdue, projects past their date, tickets past their SLA, contracts about to lapse.
 * Each rule looks at the live records and lists the worst cases first, capped so one bad month cannot bury the feed.
 */
@Component
public class RiskEngine {

    private static final int LIMIT = 25;

    private final NamedParameterJdbcTemplate jdbc;
    private final PulseCalendar calendar;

    RiskEngine(NamedParameterJdbcTemplate jdbc, PulseCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    public List<PulseInsight> generate(UUID orgId) {
        LocalDate today = calendar.today();
        OffsetDateTime now = OffsetDateTime.ofInstant(calendar.now(), ZoneOffset.UTC);
        MapSqlParameterSource p = new MapSqlParameterSource("org", orgId)
                .addValue("today", today)
                .addValue("now", now)
                .addValue("weekAgo", now.minusDays(7))
                .addValue("limit", LIMIT);
        List<PulseInsight> insights = new ArrayList<>();
        insights.addAll(untouchedLeads(orgId, p));
        insights.addAll(overdueInvoices(orgId, p));
        insights.addAll(delayedProjects(orgId, p));
        insights.addAll(slaBreaches(orgId, p));
        insights.addAll(expiringContracts(orgId, p));
        return insights;
    }

    /** Open leads older than a week with nothing logged against them in the last week. Best-scored first. */
    private List<PulseInsight> untouchedLeads(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT l.id, l.contact_name, l.company_name, l.score, l.estimated_value, l.created_at, "
                        + "(SELECT max(a.occurred_at) FROM lead_activities a WHERE a.lead_id = l.id) "
                        + "FROM leads l WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.status = 'OPEN' AND l.created_at < :weekAgo "
                        + "AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id = l.id AND a.occurred_at >= :weekAgo) "
                        + "ORDER BY l.score DESC, l.created_at LIMIT :limit",
                p, (rs, n) -> {
                    String company = rs.getString(3);
                    String label = rs.getString(2) + (company != null ? " (" + company + ")" : "");
                    OffsetDateTime last = rs.getObject(7, OffsetDateTime.class);
                    String quiet = last == null ? "nothing has been logged against it since it was created" : "nothing has been logged for over a week";
                    return Insights.about(org, PulseInsightType.RISK, PulseInsightCategory.UNTOUCHED_LEAD, "Lead", rs.getObject(1, UUID.class), label,
                            55 + rs.getInt(4) / 3,
                            "Untouched lead: " + label,
                            "Lead " + label + " is still open, " + quiet + ".",
                            "Leads that go a week without contact convert far less often.",
                            "Call " + rs.getString(2) + " today to find out where they are, and log the conversation.",
                            rs.getBigDecimal(5) == null ? null : "Keeps " + Insights.inr(rs.getBigDecimal(5)) + " of potential business alive.", null, null);
                });
    }

    /** Open invoices more than 15 days past due, longest overdue first. The owner is whoever holds the open collection task, if any. */
    private List<PulseInsight> overdueInvoices(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT i.id, i.invoice_number, i.customer_name, i.due_date, (i.total + i.debit_total - i.credit_total - i.amount_paid), :today - i.due_date, "
                        + "(SELECT ct.assigned_to_user_id FROM collection_tasks ct WHERE ct.invoice_id = i.id AND ct.status IN ('OPEN', 'IN_PROGRESS') ORDER BY ct.created_at DESC LIMIT 1), "
                        + "(SELECT u.full_name FROM collection_tasks ct JOIN users u ON u.id = ct.assigned_to_user_id WHERE ct.invoice_id = i.id AND ct.status IN ('OPEN', 'IN_PROGRESS') ORDER BY ct.created_at DESC LIMIT 1) "
                        + "FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date < :today - 15 "
                        + "ORDER BY i.due_date LIMIT :limit",
                p, (rs, n) -> {
                    long days = rs.getLong(6);
                    return Insights.about(org, PulseInsightType.RISK, PulseInsightCategory.OVERDUE_PAYMENT, "Invoice", rs.getObject(1, UUID.class),
                            rs.getString(2) + " – " + rs.getString(3), Insights.scale(70, days, 5, 95),
                            "Overdue payment: " + rs.getString(2),
                            "Invoice " + rs.getString(2) + " for " + rs.getString(3) + " is " + days + " days past due, with " + Insights.inr(rs.getBigDecimal(5)) + " still owing.",
                            "Overdue receivables tie up cash and get harder to collect the longer they wait.",
                            "Call " + rs.getString(3) + " and agree a payment date, or a payment plan.",
                            "Recover " + Insights.inr(rs.getBigDecimal(5)) + ".", rs.getObject(7, UUID.class), rs.getString(8));
                });
    }

    /** Running projects past their expected completion date, latest first. Owned by the project manager. */
    private List<PulseInsight> delayedProjects(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT p.id, p.project_number, p.title, p.customer_name, p.expected_completion_date, :today - p.expected_completion_date, p.progress_percentage, p.project_manager_id, p.project_manager_name "
                        + "FROM projects p LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status "
                        + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND NOT coalesce(ps.is_completed, p.status = 'COMPLETED') AND NOT coalesce(ps.is_cancelled, p.status = 'CANCELLED') "
                        + "AND p.expected_completion_date < :today ORDER BY p.expected_completion_date LIMIT :limit",
                p, (rs, n) -> {
                    long days = rs.getLong(6);
                    return Insights.about(org, PulseInsightType.RISK, PulseInsightCategory.DELAYED_PROJECT, "Project", rs.getObject(1, UUID.class),
                            rs.getString(2) + " – " + rs.getString(3), Insights.scale(65, days, 4, 92),
                            "Delayed project: " + rs.getString(3),
                            "Project " + rs.getString(2) + " for " + rs.getString(4) + " was due on " + rs.getObject(5, LocalDate.class) + " and is " + days + " days late at " + rs.getInt(7) + "% progress.",
                            "Late projects delay revenue, strain the customer relationship and tie up the team.",
                            "Find what is blocking it, agree a new date with " + rs.getString(4) + " and update the plan.",
                            null, rs.getObject(8, UUID.class), rs.getString(9));
                });
    }

    /** Open tickets already past their SLA due time, longest overdue first. Owned by the assigned agent. */
    private List<PulseInsight> slaBreaches(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT t.id, t.ticket_number, t.customer_name, t.subject, t.priority, t.assigned_user_id, t.assigned_user_name, extract(epoch FROM (:now - t.due_at)) / 3600 "
                        + "FROM tickets t WHERE t.organization_id = :org AND t.status NOT IN ('RESOLVED', 'CLOSED') AND t.due_at IS NOT NULL AND t.due_at < :now "
                        + "ORDER BY t.due_at LIMIT :limit",
                p, (rs, n) -> {
                    long hours = Math.round(rs.getDouble(8));
                    return Insights.about(org, PulseInsightType.RISK, PulseInsightCategory.SLA_BREACH, "Ticket", rs.getObject(1, UUID.class),
                            rs.getString(2) + " – " + rs.getString(4), Insights.scale("CRITICAL".equals(rs.getString(5)) ? 85 : 75, hours, 6, 98),
                            "SLA breached: " + rs.getString(2),
                            "Ticket " + rs.getString(2) + " (" + rs.getString(4) + ") from " + rs.getString(3) + " is " + hours + " hours past its SLA deadline.",
                            "SLA breaches damage trust and can trigger contractual penalties.",
                            "Resolve or escalate " + rs.getString(2) + " now and update " + rs.getString(3) + " on progress.",
                            null, rs.getObject(6, UUID.class), rs.getString(7));
                });
    }

    /** AMC contracts in force that end within 15 days. */
    private List<PulseInsight> expiringContracts(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, a.end_date, a.contract_value, a.end_date - :today "
                        + "FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id "
                        + "WHERE a.organization_id = :org AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date BETWEEN :today AND :today + 15 ORDER BY a.end_date LIMIT :limit",
                p, (rs, n) -> {
                    long days = rs.getLong(6);
                    return Insights.about(org, PulseInsightType.RISK, PulseInsightCategory.AMC_EXPIRY, "AMC", rs.getObject(1, UUID.class),
                            rs.getString(2) + " – " + rs.getString(3), (int) (92 - days),
                            "AMC ending in " + days + " days: " + rs.getString(2),
                            "AMC " + rs.getString(2) + " for " + rs.getString(3) + " ends on " + rs.getObject(4, LocalDate.class) + " (" + Insights.inr(rs.getBigDecimal(5)) + " a year).",
                            "A lapsed contract leaves the customer uncovered and the business without recurring revenue.",
                            "Send the renewal quote for " + rs.getString(2) + " and confirm with " + rs.getString(3) + " this week.",
                            "Keeps " + Insights.inr(rs.getBigDecimal(5)) + " of recurring revenue.", null, null);
                });
    }
}
