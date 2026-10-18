package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.pulse.api.PulseInsightCategory;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Achievement Engine: good news from the last day or two, worth a thank-you: a project completed, an AMC renewed,
 * a customer's first order, a large payment. Reads the records directly (no entities loaded).
 */
@Component
public class AchievementEngine {

    /** A payment at or above this is worth a mention. */
    private static final BigDecimal LARGE_PAYMENT = BigDecimal.valueOf(100_000);

    private final NamedParameterJdbcTemplate jdbc;
    private final PulseCalendar calendar;

    AchievementEngine(NamedParameterJdbcTemplate jdbc, PulseCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    public List<PulseInsight> generate(UUID orgId) {
        LocalDate today = calendar.today();
        MapSqlParameterSource p = new MapSqlParameterSource("org", orgId)
                .addValue("since", today.minusDays(1))
                .addValue("sinceTs", OffsetDateTime.ofInstant(calendar.now().minusSeconds(24 * 3600L), ZoneOffset.UTC))
                .addValue("large", LARGE_PAYMENT);
        List<PulseInsight> insights = new ArrayList<>();
        insights.addAll(completedProjects(orgId, p));
        insights.addAll(renewedContracts(orgId, p));
        insights.addAll(firstOrders(orgId, p));
        insights.addAll(largePayments(orgId, p));
        return insights;
    }

    private List<PulseInsight> completedProjects(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT p.id, p.project_number, p.title, p.customer_name, p.project_manager_id, p.project_manager_name, p.actual_completion_date, p.expected_completion_date "
                        + "FROM projects p LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status "
                        + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND coalesce(ps.is_completed, p.status = 'COMPLETED') AND p.actual_completion_date >= :since",
                p, (rs, n) -> {
                    LocalDate done = rs.getObject(7, LocalDate.class);
                    LocalDate expected = rs.getObject(8, LocalDate.class);
                    String timing = done.isAfter(expected)
                            ? " " + ChronoUnit.DAYS.between(expected, done) + " days after its expected date."
                            : " on or before its expected date.";
                    return Insights.about(org, PulseInsightType.ACHIEVEMENT, PulseInsightCategory.PROJECT_COMPLETED, "Project", rs.getObject(1, UUID.class),
                            rs.getString(2) + " – " + rs.getString(3), 70,
                            "Project completed: " + rs.getString(3),
                            "Project " + rs.getString(2) + " for " + rs.getString(4) + " was completed" + timing,
                            "A completed project is the best moment to ask for a review, a referral or an AMC.",
                            "Thank the team, book the handover feedback call and offer " + rs.getString(4) + " an AMC.",
                            "Opens the door to recurring AMC revenue.", rs.getObject(5, UUID.class), rs.getString(6));
                });
    }

    private List<PulseInsight> renewedContracts(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, a.contract_value FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id "
                        + "WHERE a.organization_id = :org AND a.renewed_from_id IS NOT NULL AND a.created_at >= :sinceTs",
                p, (rs, n) -> Insights.about(org, PulseInsightType.ACHIEVEMENT, PulseInsightCategory.AMC_RENEWED, "AMC", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 65,
                        "AMC renewed: " + rs.getString(2),
                        "The AMC contract for " + rs.getString(3) + " was renewed (" + Insights.inr(rs.getBigDecimal(4)) + ").",
                        "Renewals are recurring revenue and a sign the customer is happy.",
                        "Confirm the first service visit of the new term is scheduled.", null, null, null));
    }

    /** An order placed in the last day by a customer who had never ordered before. */
    private List<PulseInsight> firstOrders(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT o.customer_id, o.order_number, o.customer_name, o.final_amount, o.owner_id, o.owner_name FROM orders o "
                        + "WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status <> 'CANCELLED' AND o.created_at >= :sinceTs "
                        + "AND NOT EXISTS (SELECT 1 FROM orders x WHERE x.organization_id = o.organization_id AND x.customer_id = o.customer_id AND x.deleted_at IS NULL "
                        + "AND x.id <> o.id AND x.created_at < o.created_at)",
                p, (rs, n) -> Insights.about(org, PulseInsightType.ACHIEVEMENT, PulseInsightCategory.FIRST_ORDER, "Customer", rs.getObject(1, UUID.class), rs.getString(3), 72,
                        "First order from " + rs.getString(3),
                        "Order " + rs.getString(2) + " (" + Insights.inr(rs.getBigDecimal(4)) + ") is the first this customer has placed.",
                        "How the first project goes decides whether a customer comes back.",
                        "Introduce the project manager and agree a clear delivery plan with " + rs.getString(3) + ".",
                        "Builds a long-term relationship.", rs.getObject(5, UUID.class), rs.getString(6)));
    }

    private List<PulseInsight> largePayments(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT p.id, p.payment_number, p.customer_name, p.amount FROM payments p "
                        + "WHERE p.organization_id = :org AND p.status = 'RECEIVED' AND p.received_on >= :since AND p.amount >= :large",
                p, (rs, n) -> Insights.about(org, PulseInsightType.ACHIEVEMENT, PulseInsightCategory.CUSTOMER_APPRECIATION, "Payment", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 60,
                        "Large payment from " + rs.getString(3),
                        "Receipt " + rs.getString(2) + " for " + Insights.inr(rs.getBigDecimal(4)) + " was recorded.",
                        "Prompt payments from large customers keep cash flow healthy.",
                        "Send " + rs.getString(3) + " a short thank-you and look for the next piece of work.", null, null, null));
    }
}
