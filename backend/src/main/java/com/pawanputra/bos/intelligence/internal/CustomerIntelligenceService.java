package com.pawanputra.bos.intelligence.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.intelligence.api.CustomerSegment;
import com.pawanputra.bos.intelligence.api.ScoreContributor;
import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Computes and stores customer intelligence snapshots using transparent, rule-based scoring.
 *
 * <p>Every score decision is recorded in {@code scoreBreakdown} so users can read exactly why a
 * customer has a given health score and segment. No machine learning: every rule lives here.
 */
@Service
@Transactional
public class CustomerIntelligenceService {

    private static final Logger log = LoggerFactory.getLogger(CustomerIntelligenceService.class);

    /** Max points per contributor — must sum to 100. */
    private static final int MAX_PAYMENT       = 30;
    private static final int MAX_PROJECT       = 20;
    private static final int MAX_SUPPORT       = 15;
    private static final int MAX_AMC           = 15;
    private static final int MAX_ENGAGEMENT    = 10;
    private static final int MAX_PURCHASE_FREQ = 10;

    private static final BigDecimal HIGH_VALUE_REVENUE_THRESHOLD = new BigDecimal("500000");

    private final CustomerIntelligenceRepository snapshots;
    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final Clock clock;
    /** The business calendar, so "overdue" and "last 12 months" turn over at its midnight and not the server's. */
    private final ZoneId zone;

    public CustomerIntelligenceService(
            CustomerIntelligenceRepository snapshots,
            JdbcClient jdbc,
            ObjectMapper mapper,
            Clock clock,
            @Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        this.snapshots = snapshots;
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    // ------------------------------------------------------------------ public API

    /**
     * Runs the full scoring pipeline for one customer, saves or updates the snapshot, and returns it.
     */
    public CustomerIntelligenceSnapshot compute(UUID customerId, UUID orgId) {
        Instant now = clock.instant();
        RawData data = loadRawData(customerId, orgId, now);

        List<ContributorScore> breakdown = new ArrayList<>();
        int totalScore = 0;

        ContributorScore payment = scorePaymentBehaviour(data);
        breakdown.add(payment);
        totalScore += payment.score();

        ContributorScore project = scoreProjectDelivery(data);
        breakdown.add(project);
        totalScore += project.score();

        ContributorScore support = scoreSupportActivity(data);
        breakdown.add(support);
        totalScore += support.score();

        ContributorScore amc = scoreAmcStatus(data, now);
        breakdown.add(amc);
        totalScore += amc.score();

        ContributorScore engagement = scoreEngagement(data, now);
        breakdown.add(engagement);
        totalScore += engagement.score();

        ContributorScore purchaseFreq = scorePurchaseFrequency(data, now);
        breakdown.add(purchaseFreq);
        totalScore += purchaseFreq.score();

        CustomerSegment segment = classifySegment(totalScore, data, now);
        String breakdownJson = toJson(breakdown);

        // Filled in completely before it is stored: a half-built row would break the table's NOT NULL columns.
        CustomerIntelligenceSnapshot snapshot = snapshots
                .findByCustomerIdAndOrganizationId(customerId, orgId)
                .orElseGet(() -> new CustomerIntelligenceSnapshot(customerId, orgId));

        snapshot.update(
                totalScore,
                segment,
                data.clv(),
                data.totalRevenue(),
                data.purchaseCount(),
                data.avgPurchaseValue(),
                data.activeProjects(),
                data.openTickets(),
                data.overdueInvoices(),
                data.hasActiveAmc(),
                data.lastInteractionDate(),
                data.daysSinceLastPurchase(),
                breakdownJson,
                now);

        return snapshots.save(snapshot);
    }

    /** Returns the cached snapshot; computes and stores it first if it does not exist yet (so this is not a read-only transaction). */
    public CustomerIntelligenceSnapshot getSnapshot(UUID customerId, UUID orgId) {
        return snapshots.findByCustomerIdAndOrganizationId(customerId, orgId)
                .orElseGet(() -> compute(customerId, orgId));
    }

    /**
     * Returns a human-readable explanation: "Why is this customer {segment}?" with one sentence per
     * contributor that drove the score.
     */
    public IntelligenceExplanation getExplanation(UUID customerId, UUID orgId) {
        CustomerIntelligenceSnapshot snap = getSnapshot(customerId, orgId);
        List<ContributorScore> breakdown = parseBreakdown(snap.getScoreBreakdown());

        List<String> reasons = new ArrayList<>();
        for (ContributorScore cs : breakdown) {
            reasons.add(cs.contributor().name().replace("_", " ") + ": " + cs.reason()
                    + " (scored " + cs.score() + "/" + cs.maxScore() + ")");
        }

        String headline = "Why is this customer " + snap.getSegment().name().replace("_", " ") + "?";
        return new IntelligenceExplanation(headline, snap.getSegment(), snap.getHealthScore(), reasons);
    }

    /** Recomputes every customer snapshot in an organisation. Called by the nightly job. */
    public void recomputeAll(UUID orgId) {
        List<UUID> customerIds = jdbc.sql(
                        "SELECT id FROM customers WHERE organization_id = :orgId AND deleted_at IS NULL")
                .param("orgId", orgId)
                .query(UUID.class)
                .list();

        log.info("Recomputing intelligence for {} customers in org {}", customerIds.size(), orgId);
        for (UUID cid : customerIds) {
            try {
                compute(cid, orgId);
            } catch (Exception ex) {
                log.warn("Failed to compute intelligence for customer {} in org {}: {}", cid, orgId, ex.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<CustomerIntelligenceSnapshot> listBySegment(UUID orgId, CustomerSegment segment, int page) {
        Pageable pageable = PageRequest.of(page, 25, Sort.by(Sort.Direction.DESC, "healthScore"));
        if (segment == null) {
            return snapshots.findAllByOrganizationId(orgId, pageable);
        }
        return snapshots.findBySegmentAndOrganizationId(segment, orgId, pageable);
    }

    @Transactional(readOnly = true)
    public OrgIntelligenceSummary getOrgIntelligenceSummary(UUID orgId) {
        List<Object[]> counts = snapshots.countBySegmentForOrg(orgId);
        Map<CustomerSegment, Long> bySegment = new HashMap<>();
        for (Object[] row : counts) {
            bySegment.put((CustomerSegment) row[0], (Long) row[1]);
        }
        Double avg = snapshots.avgHealthScoreForOrg(orgId);
        return new OrgIntelligenceSummary(bySegment, avg == null ? 0.0 : avg);
    }

    // ------------------------------------------------------------------ scoring rules

    private ContributorScore scorePaymentBehaviour(RawData d) {
        int overdue = d.overdueInvoices();
        if (overdue == 0 && d.latePaidCount() == 0) {
            return new ContributorScore(ScoreContributor.PAYMENT_BEHAVIOUR, MAX_PAYMENT, MAX_PAYMENT,
                    "No overdue invoices and all invoices paid within 30 days");
        } else if (overdue == 0) {
            return new ContributorScore(ScoreContributor.PAYMENT_BEHAVIOUR, 20, MAX_PAYMENT,
                    "No current overdue invoices but some late payments in history");
        } else if (overdue <= 2) {
            return new ContributorScore(ScoreContributor.PAYMENT_BEHAVIOUR, 10, MAX_PAYMENT,
                    "Customer has " + overdue + " overdue invoice" + (overdue > 1 ? "s" : ""));
        } else {
            return new ContributorScore(ScoreContributor.PAYMENT_BEHAVIOUR, 0, MAX_PAYMENT,
                    "Customer has " + overdue + " overdue invoices — high payment risk");
        }
    }

    private ContributorScore scoreProjectDelivery(RawData d) {
        int total = d.totalProjects();
        if (total == 0) {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, 0, MAX_PROJECT,
                    "No projects on record");
        }
        int delayed = d.delayedProjects();
        double delayRate = (double) delayed / total;
        if (delayRate == 0.0) {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, MAX_PROJECT, MAX_PROJECT,
                    "All " + total + " project" + (total > 1 ? "s" : "") + " delivered on time");
        } else if (delayRate < 0.10) {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, 15, MAX_PROJECT,
                    delayed + " of " + total + " projects had delays (< 10% delay rate)");
        } else if (delayRate < 0.30) {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, 10, MAX_PROJECT,
                    delayed + " of " + total + " projects had delays (10–30% delay rate)");
        } else if (delayRate < 0.50) {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, 5, MAX_PROJECT,
                    delayed + " of " + total + " projects had delays (30–50% delay rate)");
        } else {
            return new ContributorScore(ScoreContributor.PROJECT_DELIVERY, 0, MAX_PROJECT,
                    delayed + " of " + total + " projects had delays (> 50% delay rate)");
        }
    }

    private ContributorScore scoreSupportActivity(RawData d) {
        int tickets = d.ticketsLast90Days();
        int open = d.openTickets();
        if (tickets == 0) {
            return new ContributorScore(ScoreContributor.SUPPORT_ACTIVITY, MAX_SUPPORT, MAX_SUPPORT,
                    "No support tickets raised in the last 90 days");
        } else if (tickets <= 2 && open == 0) {
            return new ContributorScore(ScoreContributor.SUPPORT_ACTIVITY, 10, MAX_SUPPORT,
                    tickets + " ticket" + (tickets > 1 ? "s" : "") + " in last 90 days, all resolved");
        } else if (tickets <= 5 || open == 1) {
            return new ContributorScore(ScoreContributor.SUPPORT_ACTIVITY, 5, MAX_SUPPORT,
                    tickets + " tickets in last 90 days, " + open + " still open");
        } else {
            return new ContributorScore(ScoreContributor.SUPPORT_ACTIVITY, 0, MAX_SUPPORT,
                    tickets + " tickets in last 90 days, " + open + " open — high support load");
        }
    }

    private ContributorScore scoreAmcStatus(RawData d, Instant now) {
        if (!d.hasActiveAmc()) {
            return new ContributorScore(ScoreContributor.AMC_STATUS, 0, MAX_AMC,
                    "No active AMC contract");
        }
        long daysToExpiry = d.amcDaysToExpiry() == null ? 0 : d.amcDaysToExpiry();
        if (daysToExpiry > 30) {
            return new ContributorScore(ScoreContributor.AMC_STATUS, MAX_AMC, MAX_AMC,
                    "Active AMC with " + daysToExpiry + " days until expiry");
        } else if (daysToExpiry >= 15) {
            return new ContributorScore(ScoreContributor.AMC_STATUS, 10, MAX_AMC,
                    "Active AMC expiring in " + daysToExpiry + " days (15–30 day window)");
        } else {
            return new ContributorScore(ScoreContributor.AMC_STATUS, 5, MAX_AMC,
                    "Active AMC expiring in " + daysToExpiry + " days — renewal overdue");
        }
    }

    private ContributorScore scoreEngagement(RawData d, Instant now) {
        if (d.lastInteractionDate() == null) {
            return new ContributorScore(ScoreContributor.ENGAGEMENT, 0, MAX_ENGAGEMENT,
                    "No interaction has been logged for this customer");
        }
        long days = Duration.between(d.lastInteractionDate(), now).toDays();
        if (days <= 30) {
            return new ContributorScore(ScoreContributor.ENGAGEMENT, MAX_ENGAGEMENT, MAX_ENGAGEMENT,
                    "Last interaction was " + days + " day" + (days != 1 ? "s" : "") + " ago (within 30 days)");
        } else if (days <= 60) {
            return new ContributorScore(ScoreContributor.ENGAGEMENT, 7, MAX_ENGAGEMENT,
                    "Last interaction was " + days + " days ago (within 60 days)");
        } else if (days <= 90) {
            return new ContributorScore(ScoreContributor.ENGAGEMENT, 4, MAX_ENGAGEMENT,
                    "Last interaction was " + days + " days ago (within 90 days)");
        } else {
            return new ContributorScore(ScoreContributor.ENGAGEMENT, 0, MAX_ENGAGEMENT,
                    "Last interaction was " + days + " days ago — no engagement in 90+ days");
        }
    }

    private ContributorScore scorePurchaseFrequency(RawData d, Instant now) {
        int purchases = d.purchasesLast12Months();
        if (purchases >= 3) {
            return new ContributorScore(ScoreContributor.PURCHASE_FREQUENCY, MAX_PURCHASE_FREQ, MAX_PURCHASE_FREQ,
                    purchases + " purchases in the last 12 months");
        } else if (purchases == 2) {
            return new ContributorScore(ScoreContributor.PURCHASE_FREQUENCY, 7, MAX_PURCHASE_FREQ,
                    "2 purchases in the last 12 months");
        } else if (purchases == 1) {
            return new ContributorScore(ScoreContributor.PURCHASE_FREQUENCY, 4, MAX_PURCHASE_FREQ,
                    "1 purchase in the last 12 months");
        } else {
            return new ContributorScore(ScoreContributor.PURCHASE_FREQUENCY, 0, MAX_PURCHASE_FREQ,
                    "No purchases in the last 12 months");
        }
    }

    // ------------------------------------------------------------------ segmentation

    private CustomerSegment classifySegment(int score, RawData d, Instant now) {
        // NEW: account < 90 days old with at least one purchase
        if (d.customerSince() != null) {
            long ageDays = Duration.between(d.customerSince(), now).toDays();
            if (ageDays < 90 && d.purchaseCount() > 0) {
                return CustomerSegment.NEW;
            }
        }

        // HIGH_VALUE: score 70+ and total revenue > 500,000
        if (score >= 70 && d.totalRevenue().compareTo(HIGH_VALUE_REVENUE_THRESHOLD) > 0) {
            return CustomerSegment.HIGH_VALUE;
        }

        // HEALTHY: 80-100
        if (score >= 80) {
            return CustomerSegment.HEALTHY;
        }

        // INACTIVE: score < 50 and last purchase > 180 days ago
        if (score < 50 && d.daysSinceLastPurchase() != null && d.daysSinceLastPurchase() > 180) {
            return CustomerSegment.INACTIVE;
        }

        // AT_RISK: 50-79, or score < 50 with overdue invoices
        return CustomerSegment.AT_RISK;
    }

    // ------------------------------------------------------------------ data loading

    /**
     * Reads what the scoring rules need from the customer's own records. Dates are the business's calendar dates
     * (see {@code app.finance.time-zone}); "completed" and "cancelled" projects follow the organization's own project
     * status flags; an invoice counts as overdue while it still has an amount outstanding past its due date.
     */
    private RawData loadRawData(UUID customerId, UUID orgId, Instant now) {
        LocalDate today = LocalDate.ofInstant(now, zone);

        Instant customerSince = jdbc.sql(
                        "SELECT created_at FROM customers WHERE id = :id AND organization_id = :orgId AND deleted_at IS NULL")
                .param("id", customerId)
                .param("orgId", orgId)
                .query(OffsetDateTime.class)
                .optional()
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Customer not found"))
                .toInstant();

        // Payment behaviour: invoices still owing money past their due date.
        int overdueInvoices = count(customerId, orgId,
                "SELECT COUNT(*) FROM invoices WHERE customer_id = :cid AND organization_id = :orgId AND deleted_at IS NULL "
                        + "AND status IN ('ISSUED', 'PARTIALLY_PAID') AND due_date < :today "
                        + "AND (total + debit_total - credit_total - amount_paid) > 0",
                "today", today);

        // Paid invoices whose last payment came more than 30 days after the invoice was issued.
        int latePaidCount = count(customerId, orgId,
                "SELECT COUNT(*) FROM invoices i WHERE i.customer_id = :cid AND i.organization_id = :orgId AND i.deleted_at IS NULL "
                        + "AND i.status = 'PAID' AND i.issue_date IS NOT NULL "
                        + "AND (SELECT max(p.received_on) FROM payment_allocations a JOIN payments p ON p.id = a.payment_id "
                        + "     WHERE a.invoice_id = i.id AND a.amount > 0 AND p.status = 'RECEIVED') - i.issue_date > 30");

        // Projects. Whether one is finished comes from the organization's project statuses, with the default codes as the fallback.
        String projects = "FROM projects p LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status "
                + "WHERE p.customer_id = :cid AND p.organization_id = :orgId AND p.deleted_at IS NULL ";
        String completed = "AND coalesce(ps.is_completed, p.status = 'COMPLETED') ";
        int totalProjects = count(customerId, orgId, "SELECT COUNT(*) " + projects + completed);
        int delayedProjects = count(customerId, orgId,
                "SELECT COUNT(*) " + projects + completed + "AND p.actual_completion_date > p.expected_completion_date");
        int activeProjects = count(customerId, orgId,
                "SELECT COUNT(*) " + projects + "AND NOT coalesce(ps.is_completed, p.status = 'COMPLETED') "
                        + "AND NOT coalesce(ps.is_cancelled, p.status = 'CANCELLED')");

        // Support: tickets raised in the last 90 days, and those still open.
        int ticketsLast90Days = count(customerId, orgId,
                "SELECT COUNT(*) FROM tickets WHERE customer_id = :cid AND organization_id = :orgId AND created_at >= :since",
                "since", OffsetDateTime.ofInstant(now.minus(Duration.ofDays(90)), ZoneOffset.UTC));
        int openTickets = count(customerId, orgId,
                "SELECT COUNT(*) FROM tickets WHERE customer_id = :cid AND organization_id = :orgId "
                        + "AND status NOT IN ('RESOLVED', 'CLOSED')");

        // AMC in force: active or waiting to be renewed, and not yet ended.
        String inForce = "FROM amc_contracts WHERE customer_id = :cid AND organization_id = :orgId "
                + "AND status IN ('ACTIVE', 'RENEWAL_PENDING') AND end_date >= :today";
        boolean hasActiveAmc = count(customerId, orgId, "SELECT COUNT(*) " + inForce, "today", today) > 0;
        Long amcDaysToExpiry = null;
        if (hasActiveAmc) {
            amcDaysToExpiry = jdbc.sql("SELECT min(end_date) - :today " + inForce)
                    .param("cid", customerId)
                    .param("orgId", orgId)
                    .param("today", today)
                    .query(Long.class)
                    .optional()
                    .orElse(0L);
        }

        // Engagement: the last logged interaction.
        Instant lastInteractionDate = jdbc.sql("SELECT MAX(occurred_at) FROM customer_interactions WHERE customer_id = :cid")
                .param("cid", customerId)
                .query(OffsetDateTime.class)
                .optional()
                .map(OffsetDateTime::toInstant)
                .orElse(null);

        // Finance: what has been paid for (lifetime value) and what has been billed.
        BigDecimal clv = jdbc.sql(
                        "SELECT COALESCE(SUM(total), 0) FROM invoices "
                                + "WHERE customer_id = :cid AND organization_id = :orgId AND deleted_at IS NULL AND status = 'PAID'")
                .param("cid", customerId)
                .param("orgId", orgId)
                .query(BigDecimal.class)
                .single();

        BigDecimal totalRevenue = jdbc.sql(
                        "SELECT COALESCE(SUM(total), 0) FROM invoices "
                                + "WHERE customer_id = :cid AND organization_id = :orgId AND deleted_at IS NULL "
                                + "AND status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')")
                .param("cid", customerId)
                .param("orgId", orgId)
                .query(BigDecimal.class)
                .single();

        int purchaseCount = count(customerId, orgId,
                "SELECT COUNT(*) FROM invoices WHERE customer_id = :cid AND organization_id = :orgId AND deleted_at IS NULL AND status = 'PAID'");

        BigDecimal avgPurchaseValue = purchaseCount > 0
                ? clv.divide(BigDecimal.valueOf(purchaseCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // The last time the customer paid anything.
        LocalDate lastPurchaseDate = jdbc.sql(
                        "SELECT MAX(received_on) FROM payments WHERE customer_id = :cid AND organization_id = :orgId AND status = 'RECEIVED'")
                .param("cid", customerId)
                .param("orgId", orgId)
                .query(LocalDate.class)
                .optional()
                .orElse(null);
        Integer daysSinceLastPurchase = lastPurchaseDate == null ? null : (int) ChronoUnit.DAYS.between(lastPurchaseDate, today);

        int purchasesLast12Months = count(customerId, orgId,
                "SELECT COUNT(*) FROM invoices WHERE customer_id = :cid AND organization_id = :orgId AND deleted_at IS NULL "
                        + "AND status = 'PAID' AND issue_date >= :since",
                "since", today.minusDays(365));

        return new RawData(
                customerSince,
                overdueInvoices,
                latePaidCount,
                totalProjects,
                delayedProjects,
                activeProjects,
                ticketsLast90Days,
                openTickets,
                hasActiveAmc,
                amcDaysToExpiry,
                lastInteractionDate,
                clv,
                totalRevenue,
                purchaseCount,
                avgPurchaseValue,
                daysSinceLastPurchase,
                purchasesLast12Months);
    }

    /** A count over the customer's records; {@code named} are further name/value parameters of the query. */
    private int count(UUID customerId, UUID orgId, String sql, Object... named) {
        JdbcClient.StatementSpec spec = jdbc.sql(sql).param("cid", customerId).param("orgId", orgId);
        for (int i = 0; i < named.length; i += 2) {
            spec = spec.param((String) named[i], named[i + 1]);
        }
        return spec.query(Integer.class).single();
    }

    // ------------------------------------------------------------------ helpers

    private String toJson(List<ContributorScore> breakdown) {
        try {
            List<Map<String, Object>> list = new ArrayList<>();
            for (ContributorScore cs : breakdown) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("contributor", cs.contributor().name());
                m.put("score", cs.score());
                m.put("maxScore", cs.maxScore());
                m.put("reason", cs.reason());
                list.add(m);
            }
            return mapper.writeValueAsString(list);
        } catch (JsonProcessingException ex) {
            return "[]";
        }
    }

    @SuppressWarnings("unchecked")
    private List<ContributorScore> parseBreakdown(String json) {
        List<ContributorScore> result = new ArrayList<>();
        if (json == null || json.isBlank()) {
            return result;
        }
        try {
            List<Map<String, Object>> list = mapper.readValue(json, List.class);
            for (Map<String, Object> m : list) {
                ScoreContributor contributor = ScoreContributor.valueOf((String) m.get("contributor"));
                int score = ((Number) m.get("score")).intValue();
                int maxScore = ((Number) m.get("maxScore")).intValue();
                String reason = (String) m.get("reason");
                result.add(new ContributorScore(contributor, score, maxScore, reason));
            }
        } catch (Exception ex) {
            log.warn("Failed to parse score breakdown JSON: {}", ex.getMessage());
        }
        return result;
    }

    // ------------------------------------------------------------------ value types

    /** One contributor's score with the human-readable reason. */
    public record ContributorScore(ScoreContributor contributor, int score, int maxScore, String reason) {
    }

    /** Explanation of why a customer has a given segment. */
    public record IntelligenceExplanation(
            String headline,
            CustomerSegment segment,
            int healthScore,
            List<String> reasons) {
    }

    /** Org-wide breakdown: count per segment and average health score. */
    public record OrgIntelligenceSummary(Map<CustomerSegment, Long> countBySegment, double avgHealthScore) {
    }

    /** Raw data fetched from the database before scoring. Package-private for testability. */
    record RawData(
            Instant customerSince,
            int overdueInvoices,
            int latePaidCount,
            int totalProjects,
            int delayedProjects,
            int activeProjects,
            int ticketsLast90Days,
            int openTickets,
            boolean hasActiveAmc,
            Long amcDaysToExpiry,
            Instant lastInteractionDate,
            BigDecimal clv,
            BigDecimal totalRevenue,
            int purchaseCount,
            BigDecimal avgPurchaseValue,
            Integer daysSinceLastPurchase,
            int purchasesLast12Months) {
    }
}
