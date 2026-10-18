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
 * Next Best Action Engine: one concrete thing to do about a record right now: chase an overdue invoice, call about an
 * AMC renewal, resolve a ticket that has been open too long, send a quotation that is approved but unsent, assign a
 * technician to a coming AMC visit, or check in with a quiet customer.
 */
@Component
public class NextBestActionEngine {

    private static final int LIMIT = 10;

    private final NamedParameterJdbcTemplate jdbc;
    private final PulseCalendar calendar;

    NextBestActionEngine(NamedParameterJdbcTemplate jdbc, PulseCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    public List<PulseInsight> generate(UUID orgId) {
        OffsetDateTime now = OffsetDateTime.ofInstant(calendar.now(), ZoneOffset.UTC);
        MapSqlParameterSource p = new MapSqlParameterSource("org", orgId)
                .addValue("today", calendar.today())
                .addValue("twoDaysAgo", now.minusDays(2))
                .addValue("quarterAgo", now.minusDays(90))
                .addValue("limit", LIMIT);
        List<PulseInsight> insights = new ArrayList<>();
        insights.addAll(collectPayment(orgId, p));
        insights.addAll(renewContract(orgId, p));
        insights.addAll(resolveTickets(orgId, p));
        insights.addAll(sendQuotations(orgId, p));
        insights.addAll(assignVisits(orgId, p));
        insights.addAll(checkIn(orgId, p));
        return insights;
    }

    /** The ten largest invoices more than 15 days overdue. */
    private List<PulseInsight> collectPayment(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT i.id, i.invoice_number, i.customer_name, (i.total + i.debit_total - i.credit_total - i.amount_paid) AS owing, :today - i.due_date "
                        + "FROM invoices i WHERE i.organization_id = :org AND i.deleted_at IS NULL AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date < :today - 15 "
                        + "ORDER BY owing DESC LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION, PulseInsightCategory.COLLECT_PAYMENT, "Invoice", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), Insights.scale(80, rs.getLong(5), 10, 92),
                        "Collect " + Insights.inr(rs.getBigDecimal(4)) + " from " + rs.getString(3),
                        "Invoice " + rs.getString(2) + " is " + rs.getLong(5) + " days overdue.",
                        "Every extra day unpaid is cash tied up outside the business.",
                        "Phone " + rs.getString(3) + " about " + rs.getString(2) + " and note the promised date on the invoice.",
                        "Recover " + Insights.inr(rs.getBigDecimal(4)) + ".", null, null));
    }

    /** AMC contracts in force that end within 30 days. */
    private List<PulseInsight> renewContract(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, a.end_date FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id "
                        + "WHERE a.organization_id = :org AND a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date BETWEEN :today AND :today + 30 ORDER BY a.end_date LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION, PulseInsightCategory.CALL_CUSTOMER, "AMC", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 78,
                        "Call " + rs.getString(3) + " about renewing " + rs.getString(2),
                        "AMC " + rs.getString(2) + " ends on " + rs.getObject(4, LocalDate.class) + ".",
                        "Without a renewal the customer is left without cover and the contract lapses.",
                        "Agree the renewal with " + rs.getString(3) + " and send the renewal quote.", null, null, null));
    }

    /** Tickets still open after two days, most overdue first. */
    private List<PulseInsight> resolveTickets(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT t.id, t.ticket_number, t.customer_name, t.subject, t.assigned_user_id, t.assigned_user_name FROM tickets t "
                        + "WHERE t.organization_id = :org AND t.status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER') AND t.created_at < :twoDaysAgo "
                        + "ORDER BY t.due_at NULLS LAST LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION, PulseInsightCategory.RESOLVE_TICKET, "Ticket", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(4), 68,
                        "Resolve ticket " + rs.getString(2),
                        "Ticket " + rs.getString(2) + " (" + rs.getString(4) + ") from " + rs.getString(3) + " has been open for more than two days.",
                        "Faster resolution keeps customers satisfied and avoids an SLA breach.",
                        "Update " + rs.getString(3) + " on " + rs.getString(2) + " and close it as soon as the work is done.",
                        null, rs.getObject(5, UUID.class), rs.getString(6)));
    }

    /** Quotations that were approved more than two days ago and still have not been sent to the customer. */
    private List<PulseInsight> sendQuotations(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT q.id, q.quotation_number, q.customer_name, q.final_amount, q.owner_id, q.owner_name FROM quotations q "
                        + "WHERE q.organization_id = :org AND q.deleted_at IS NULL AND q.status = 'APPROVED' AND q.approved_at < :twoDaysAgo ORDER BY q.final_amount DESC LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION, PulseInsightCategory.SEND_QUOTATION, "Quotation", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 74,
                        "Send quotation " + rs.getString(2),
                        "Quotation " + rs.getString(2) + " (" + Insights.inr(rs.getBigDecimal(4)) + ") for " + rs.getString(3) + " is approved but has not been sent.",
                        "A quotation the customer has not received cannot win the deal.",
                        "Send " + rs.getString(2) + " to " + rs.getString(3) + " today and book a follow-up.",
                        "Puts " + Insights.inr(rs.getBigDecimal(4)) + " in front of the customer.", rs.getObject(5, UUID.class), rs.getString(6)));
    }

    /** AMC service visits in the next week that nobody is assigned to. */
    private List<PulseInsight> assignVisits(UUID org, MapSqlParameterSource p) {
        return jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, v.scheduled_date FROM amc_service_visits v JOIN amc_contracts a ON a.id = v.contract_id LEFT JOIN customers c ON c.id = a.customer_id "
                        + "WHERE a.organization_id = :org AND v.status = 'SCHEDULED' AND v.assigned_employee_id IS NULL AND a.assigned_employee_id IS NULL AND v.scheduled_date BETWEEN :today AND :today + 7 "
                        + "ORDER BY v.scheduled_date LIMIT :limit",
                p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION, PulseInsightCategory.SCHEDULE_VISIT, "AMC", rs.getObject(1, UUID.class),
                        rs.getString(2) + " – " + rs.getString(3), 72,
                        "Assign a technician to the visit at " + rs.getString(3),
                        "A service visit for AMC " + rs.getString(2) + " is booked for " + rs.getObject(4, LocalDate.class) + " and nobody is assigned to it.",
                        "Missed AMC visits are a breach of the contract and a reason to cancel it.",
                        "Assign a technician to the visit and confirm the time with " + rs.getString(3) + ".", null, null, null));
    }

    /** Customers with no activity in 90 days. */
    private List<PulseInsight> checkIn(UUID org, MapSqlParameterSource p) {
        return jdbc.query(OpportunityEngine.DORMANT_CUSTOMERS_SQL.replace("{INTERVAL}", ":quarterAgo"), p, (rs, n) -> Insights.about(org, PulseInsightType.NEXT_BEST_ACTION,
                PulseInsightCategory.CONTACT_INACTIVE, "Customer", rs.getObject(1, UUID.class), rs.getString(2), 58,
                "Check in with " + rs.getString(2),
                rs.getString(2) + " has had no orders, invoices, payments or logged contact for over 90 days.",
                "Customers who hear nothing from us drift to whoever calls next.",
                "Call " + rs.getString(2) + " to check how everything is running and ask about upcoming needs.",
                null, rs.getObject(3, UUID.class), rs.getString(4)));
    }
}
