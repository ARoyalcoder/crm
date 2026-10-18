package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.rewards.api.RewardTransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable ledger entry for a single reward point event on a customer.
 * Points is positive for EARNED / ADJUSTED-up and negative for REDEEMED / EXPIRED / ADJUSTED-down.
 */
@Entity
@Table(name = "reward_transactions")
public class RewardTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 20)
    private RewardTransactionType transactionType;

    /** Positive for EARNED; negative for REDEEMED/EXPIRED. */
    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RewardTransaction() {
        // for JPA
    }

    public RewardTransaction(
            UUID organizationId,
            UUID customerId,
            RewardTransactionType transactionType,
            int points,
            String reason,
            String referenceType,
            UUID referenceId) {
        this.organizationId = organizationId;
        this.customerId = customerId;
        this.transactionType = transactionType;
        this.points = points;
        this.reason = reason;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getCustomerId() { return customerId; }
    public RewardTransactionType getTransactionType() { return transactionType; }
    public int getPoints() { return points; }
    public String getReason() { return reason; }
    public String getReferenceType() { return referenceType; }
    public UUID getReferenceId() { return referenceId; }
    public Instant getCreatedAt() { return createdAt; }
}
