package com.pawanputra.bos.intelligence.internal;

import com.pawanputra.bos.intelligence.api.CustomerSegment;
import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A point-in-time snapshot of a customer's computed health score, segment and key metrics.
 * One row per customer per organisation; recomputed nightly or on demand.
 * The {@link #scoreBreakdown} column holds a JSON array so every score decision is
 * fully explainable from the database without loading Java.
 */
@Entity
@Table(name = "customer_intelligence_snapshots")
public class CustomerIntelligenceSnapshot extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "health_score", nullable = false)
    private Integer healthScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "segment", nullable = false, length = 20)
    private CustomerSegment segment;

    /** Customer Lifetime Value: sum of all paid invoices for this customer. */
    @Column(name = "clv", nullable = false, precision = 15, scale = 2)
    private BigDecimal clv = BigDecimal.ZERO;

    @Column(name = "total_revenue", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "purchase_count", nullable = false)
    private Integer purchaseCount = 0;

    @Column(name = "avg_purchase_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal avgPurchaseValue = BigDecimal.ZERO;

    @Column(name = "active_projects", nullable = false)
    private Integer activeProjects = 0;

    @Column(name = "open_tickets", nullable = false)
    private Integer openTickets = 0;

    @Column(name = "overdue_invoices", nullable = false)
    private Integer overdueInvoices = 0;

    @Column(name = "has_active_amc", nullable = false)
    private boolean hasActiveAmc = false;

    @Column(name = "last_interaction_date")
    private Instant lastInteractionDate;

    @Column(name = "days_since_last_purchase")
    private Integer daysSinceLastPurchase;

    /**
     * JSON array of score-contributor entries. Each entry:
     * {@code {"contributor":"PAYMENT_BEHAVIOUR","score":20,"maxScore":30,"reason":"..."}}
     */
    @Column(name = "score_breakdown", columnDefinition = "TEXT")
    private String scoreBreakdown;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

    protected CustomerIntelligenceSnapshot() {
        // for JPA
    }

    public CustomerIntelligenceSnapshot(UUID customerId, UUID organizationId) {
        this.customerId = customerId;
        this.organizationId = organizationId;
    }

    // ------------------------------------------------------------------ mutators

    public void update(
            int healthScore,
            CustomerSegment segment,
            BigDecimal clv,
            BigDecimal totalRevenue,
            int purchaseCount,
            BigDecimal avgPurchaseValue,
            int activeProjects,
            int openTickets,
            int overdueInvoices,
            boolean hasActiveAmc,
            Instant lastInteractionDate,
            Integer daysSinceLastPurchase,
            String scoreBreakdown,
            Instant computedAt) {
        this.healthScore = healthScore;
        this.segment = segment;
        this.clv = clv;
        this.totalRevenue = totalRevenue;
        this.purchaseCount = purchaseCount;
        this.avgPurchaseValue = avgPurchaseValue;
        this.activeProjects = activeProjects;
        this.openTickets = openTickets;
        this.overdueInvoices = overdueInvoices;
        this.hasActiveAmc = hasActiveAmc;
        this.lastInteractionDate = lastInteractionDate;
        this.daysSinceLastPurchase = daysSinceLastPurchase;
        this.scoreBreakdown = scoreBreakdown;
        this.computedAt = computedAt;
    }

    // ------------------------------------------------------------------ accessors

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public Integer getHealthScore() {
        return healthScore;
    }

    public CustomerSegment getSegment() {
        return segment;
    }

    public BigDecimal getClv() {
        return clv;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }

    public Integer getPurchaseCount() {
        return purchaseCount;
    }

    public BigDecimal getAvgPurchaseValue() {
        return avgPurchaseValue;
    }

    public Integer getActiveProjects() {
        return activeProjects;
    }

    public Integer getOpenTickets() {
        return openTickets;
    }

    public Integer getOverdueInvoices() {
        return overdueInvoices;
    }

    public boolean isHasActiveAmc() {
        return hasActiveAmc;
    }

    public Instant getLastInteractionDate() {
        return lastInteractionDate;
    }

    public Integer getDaysSinceLastPurchase() {
        return daysSinceLastPurchase;
    }

    public String getScoreBreakdown() {
        return scoreBreakdown;
    }

    public Instant getComputedAt() {
        return computedAt;
    }
}
