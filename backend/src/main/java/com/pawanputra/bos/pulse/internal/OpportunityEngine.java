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
 * Opportunity Engine: revenue the business can reach for: contracts coming up for renewal, customers who have bought
 * projects but have no AMC, customers who have gone quiet, and promising leads that nobody has followed up.
 */
@Component
public class OpportunityEngine {

    private static final int LIMIT = 20;

    private final NamedParameterJdbcTemplate jdbc;
    private final PulseCalendar calendar;

    OpportunityEngine(NamedParameterJdbcTemplate jdbc, PulseCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    public List<PulseInsight> generate(UUID orgId) {
        OffsetDateTime now = OffsetDateTime.ofInstant(calendar.now(), ZoneOffset.UTC);
        MapSqlParameterSource p = new MapSqlParameterSource("org", orgId)
                .addValue("today", calendar.today())
                .addValue("weekAgo", now.minusDays(7))
                .addValue("halfYearAgo", now.minusDays(180))
                .addValue("limit", LIMIT);
        List<PulseInsight> insights = new ArrayList<>();
        insights.addAll(contractsToRenew(orgId, p));
        insights.addAll(amcCrossSell(orgId, p));
        insights.addAll(dormantCustomers(orgId, p));
        insights.addAll(promisingLeads(orgId, p));
        return insights;
    }

    /** AMC contracts ending in 31 to 60 days: time to open the renewal conversation (closer ones are risks and actions). */
    private List<PulseInsight> contractsToRenew(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, a.end_date, a.contract_value FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id "
                        + "WHERE a.organization_id = :org AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date BETWEEN :today + 16 AND :today + 60 ORDER BY a.end_date LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.OPPORTUNITY, PulseInsightCategory.AMC_RENEWAL, "AMC", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 70,
                        "AMC renewal coming up: " + rs.getString(2),
                        "AMC " + rs.getString(2) + " for " + rs.getString(3) + " ends on " + rs.getObject(4, LocalDate.class) + ".",
                        "Opening the renewal early prevents a coverage gap and secures recurring revenue.",
                        "Contact " + rs.getString(3) + " about renewing, and offer a longer term.",
                        "Renew " + Insights.inr(rs.getBigDecimal(5)) + " of annual contract value.", null, null));
    }

    /** Customers with two or more completed projects and no AMC in force. */
    private List<PulseInsight> amcCrossSell(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT c.id, c.display_name, count(pr.id) AS done FROM customers c JOIN projects pr ON pr.customer_id = c.id AND pr.organization_id = c.organization_id AND pr.deleted_at IS NULL "
                        + "LEFT JOIN project_statuses ps ON ps.organization_id = pr.organization_id AND ps.code = pr.status "
                        + "WHERE c.organization_id = :org AND c.deleted_at IS NULL AND c.status = 'ACTIVE' AND coalesce(ps.is_completed, pr.status = 'COMPLETED') "
                        + "AND NOT EXISTS (SELECT 1 FROM amc_contracts a WHERE a.customer_id = c.id AND a.organization_id = c.organization_id AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date >= :today) "
                        + "GROUP BY c.id, c.display_name HAVING count(pr.id) >= 2 ORDER BY count(pr.id) DESC LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.OPPORTUNITY, PulseInsightCategory.CROSS_SELL, "Customer", rs.getObject(1, UUID.class), rs.getString(2), 64,
                        "AMC opportunity: " + rs.getString(2),
                        rs.getString(2) + " has " + rs.getInt(3) + " completed projects with us and no AMC in force.",
                        "Customers who already trust us with several projects are the likeliest to sign a maintenance contract.",
                        "Prepare an AMC proposal for " + rs.getString(2) + " that covers what we installed.",
                        "Turns a project customer into a recurring one.", null, null));
    }

    /** Active customers with no activity of any kind (orders, invoices, payments, calls, meetings) for 180 days. */
    private List<PulseInsight> dormantCustomers(UUID org, MapSqlParameterSource p) {
        return jdbc.query(DORMANT_CUSTOMERS_SQL.replace("{INTERVAL}", ":halfYearAgo"), p, (rs, n) -> Insights.about(org, PulseInsightType.OPPORTUNITY, PulseInsightCategory.INACTIVE_CUSTOMER,
                "Customer", rs.getObject(1, UUID.class), rs.getString(2), 55,
                "Dormant customer: " + rs.getString(2),
                rs.getString(2) + " has had no orders, invoices, payments or logged contact in over six months.",
                "Winning back a past customer costs far less than finding a new one.",
                "Reach out to " + rs.getString(2) + " to ask how the installed systems are doing and what they need next.",
                "Reactivates a dormant account.", rs.getObject(3, UUID.class), rs.getString(4)));
    }

    /** Open leads with a high score and nothing logged in the last week. */
    private List<PulseInsight> promisingLeads(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT l.id, l.contact_name, l.company_name, l.score, l.estimated_value FROM leads l "
                        + "WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.status = 'OPEN' AND l.score >= 70 AND l.created_at < :weekAgo "
                        + "AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id = l.id AND a.occurred_at >= :weekAgo) ORDER BY l.score DESC LIMIT :limit",
                p, (rs, n) -> {
                    String company = rs.getString(3);
                    String label = rs.getString(2) + (company != null ? " (" + company + ")" : "");
                    return Insights.about(org, PulseInsightType.OPPORTUNITY, PulseInsightCategory.HIGH_VALUE_LEAD, "Lead", rs.getObject(1, UUID.class), label, 76,
                            "Strong lead going quiet: " + label,
                            "Lead " + label + " scores " + rs.getInt(4) + " out of 100 but nothing has been logged for over a week.",
                            "High-scoring leads cool quickly; a prompt follow-up is what turns them into quotations.",
                            "Follow up with " + rs.getString(2) + " today and move the lead forward.",
                            rs.getBigDecimal(5) == null ? null : "Advances up to " + Insights.inr(rs.getBigDecimal(5)) + " of potential business.", null, null);
                });
    }

    /** Shared with the next-best-action engine, which uses a shorter quiet period. {INTERVAL} is replaced by the cut-off parameter. */
    static final String DORMANT_CUSTOMERS_SQL =
            "SELECT c.id, c.display_name, c.assigned_user_id, (SELECT u.full_name FROM users u WHERE u.id = c.assigned_user_id) FROM customers c "
                    + "WHERE c.organization_id = :org AND c.deleted_at IS NULL AND c.status = 'ACTIVE' AND c.created_at < {INTERVAL} "
                    + "AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.created_at >= {INTERVAL}) "
                    + "AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = c.id AND i.created_at >= {INTERVAL}) "
                    + "AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.customer_id = c.id AND pay.created_at >= {INTERVAL}) "
                    + "AND NOT EXISTS (SELECT 1 FROM customer_interactions ci WHERE ci.customer_id = c.id AND ci.occurred_at >= {INTERVAL}) "
                    + "AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.entity_type = 'CUSTOMER' AND a.entity_id = c.id AND a.deleted_at IS NULL AND a.occurred_at >= {INTERVAL}) "
                    + "ORDER BY c.created_at LIMIT :limit";
}
