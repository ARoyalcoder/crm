package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.vendor.api.VendorRatingCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A single-category score for a vendor. There is at most one row per (vendor, category) pair
 * (enforced by a unique constraint). Calling addScore() upserts the value.
 */
@Entity
@Table(name = "vendor_scores")
public class VendorScore {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "vendor_id", nullable = false, updatable = false)
    private UUID vendorId;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private VendorRatingCategory category;

    /** 1–10 inclusive. */
    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "reviewed_by", nullable = false)
    private UUID reviewedBy;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "scored_at", nullable = false)
    private Instant scoredAt;

    protected VendorScore() {
        // for JPA
    }

    public VendorScore(UUID vendorId, UUID organizationId, VendorRatingCategory category,
                       int score, UUID reviewedBy, String notes) {
        this.id = UUID.randomUUID();
        this.vendorId = vendorId;
        this.organizationId = organizationId;
        this.category = category;
        this.score = score;
        this.reviewedBy = reviewedBy;
        this.notes = notes;
        this.scoredAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getVendorId() { return vendorId; }
    public UUID getOrganizationId() { return organizationId; }
    public VendorRatingCategory getCategory() { return category; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public UUID getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(UUID reviewedBy) { this.reviewedBy = reviewedBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getScoredAt() { return scoredAt; }
    public void setScoredAt(Instant scoredAt) { this.scoredAt = scoredAt; }
}
