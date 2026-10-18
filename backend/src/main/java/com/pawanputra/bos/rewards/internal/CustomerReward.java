package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Loyalty-reward ledger for a customer: accumulated points, calculated tier, and last activity.
 *
 * <p>Tier thresholds: 0–999 = STANDARD, 1 000–4 999 = SILVER, 5 000–9 999 = GOLD, 10 000+ = PLATINUM.
 */
@Entity
@Table(name = "customer_rewards")
public class CustomerReward extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "total_points", nullable = false)
    private int totalPoints = 0;

    @Column(name = "tier", nullable = false, length = 20)
    private String tier = "STANDARD";

    @Column(name = "last_activity_at")
    private Instant lastActivityAt;

    protected CustomerReward() {
        // for JPA
    }

    public CustomerReward(UUID organizationId, UUID customerId) {
        this.organizationId = organizationId;
        this.customerId = customerId;
        this.totalPoints = 0;
        this.tier = "STANDARD";
    }

    // ---- Getters ----

    public UUID getOrganizationId() { return organizationId; }
    public UUID getCustomerId() { return customerId; }
    public int getTotalPoints() { return totalPoints; }
    public String getTier() { return tier; }
    public Instant getLastActivityAt() { return lastActivityAt; }

    // ---- Mutators ----

    public void addPoints(int points) {
        this.totalPoints += points;
        this.lastActivityAt = Instant.now();
        recalculateTier();
    }

    public void deductPoints(int points) {
        this.totalPoints = Math.max(0, this.totalPoints - points);
        this.lastActivityAt = Instant.now();
        recalculateTier();
    }

    /** Recalculate the tier based on current {@link #totalPoints}. */
    public void recalculateTier() {
        if (totalPoints >= 10_000) {
            this.tier = "PLATINUM";
        } else if (totalPoints >= 5_000) {
            this.tier = "GOLD";
        } else if (totalPoints >= 1_000) {
            this.tier = "SILVER";
        } else {
            this.tier = "STANDARD";
        }
    }
}
