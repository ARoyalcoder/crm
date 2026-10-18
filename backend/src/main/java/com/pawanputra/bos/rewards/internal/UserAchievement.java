package com.pawanputra.bos.rewards.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Records when a user earns an achievement (one row per earning event).
 *
 * <p>For FIRST_MILESTONE rules a UNIQUE constraint prevents duplicate entries.
 * For COUNT_MILESTONE rules multiple rows are allowed (one per threshold crossing).
 */
@Entity
@Table(name = "user_achievements")
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "rule_id", nullable = false, updatable = false)
    private UUID ruleId;

    @Column(name = "earned_at", nullable = false, updatable = false)
    private Instant earnedAt;

    /** Optional JSON with extra context, e.g. {@code {"orderId":"…","count":10}}. */
    @Column(name = "context", columnDefinition = "text")
    private String context;

    protected UserAchievement() {
        // for JPA
    }

    public UserAchievement(UUID organizationId, UUID userId, UUID ruleId, String context) {
        this.organizationId = organizationId;
        this.userId = userId;
        this.ruleId = ruleId;
        this.earnedAt = Instant.now();
        this.context = context;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getUserId() { return userId; }
    public UUID getRuleId() { return ruleId; }
    public Instant getEarnedAt() { return earnedAt; }
    public String getContext() { return context; }
}
