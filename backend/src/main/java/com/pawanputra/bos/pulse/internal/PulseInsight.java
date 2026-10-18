package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import com.pawanputra.bos.pulse.api.PulseInsightCategory;
import com.pawanputra.bos.pulse.api.PulseInsightStatus;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A single insight produced by one of the four PAWAN PULSE engines.
 * Every insight references a real CRM entity (entityType + entityId).
 */
@Entity
@Table(name = "pulse_insights")
public class PulseInsight extends BaseEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private PulseInsightType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private PulseInsightCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PulseInsightStatus status = PulseInsightStatus.ACTIVE;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "what_happened", nullable = false, columnDefinition = "text")
    private String whatHappened;

    @Column(name = "why_it_matters", nullable = false, columnDefinition = "text")
    private String whyItMatters;

    /** The specific user who should act on this insight; null means anyone with the permission. */
    @Column(name = "who_should_act")
    private UUID whoShouldAct;

    @Column(name = "who_should_act_label", length = 200)
    private String whoShouldActLabel;

    @Column(name = "what_to_do", nullable = false, columnDefinition = "text")
    private String whatToDo;

    @Column(name = "expected_impact", columnDefinition = "text")
    private String expectedImpact;

    /** e.g. "Customer", "Invoice", "Lead", "Project", "Ticket", "AMC" */
    @Column(name = "entity_type", length = 50)
    private String entityType;

    /** PK of the CRM record this insight is about. */
    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "entity_label", length = 255)
    private String entityLabel;

    /** Priority / urgency score 0–100; higher = more urgent. */
    @Column(name = "score", nullable = false)
    private int score = 50;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "dismissed_at")
    private Instant dismissedAt;

    @Column(name = "dismissed_by")
    private UUID dismissedBy;

    protected PulseInsight() {
        // for JPA
    }

    public PulseInsight(UUID organizationId, PulseInsightType type, PulseInsightCategory category) {
        this.organizationId = organizationId;
        this.type = type;
        this.category = category;
        this.generatedAt = Instant.now();
    }

    // ------------------------------------------------------------------ mutations

    public void dismiss(UUID userId, Instant now) {
        this.status = PulseInsightStatus.DISMISSED;
        this.dismissedAt = now;
        this.dismissedBy = userId;
    }

    public void markActioned() {
        this.status = PulseInsightStatus.ACTIONED;
    }

    /** Brings an active insight up to date with what the engine now finds about the same record, and back to the top of the feed. */
    void refreshFrom(PulseInsight latest, Instant now, Instant expiry) {
        this.title = latest.title;
        this.whatHappened = latest.whatHappened;
        this.whyItMatters = latest.whyItMatters;
        this.whatToDo = latest.whatToDo;
        this.expectedImpact = latest.expectedImpact;
        this.whoShouldAct = latest.whoShouldAct;
        this.whoShouldActLabel = latest.whoShouldActLabel;
        this.entityLabel = latest.entityLabel;
        this.score = latest.score;
        this.generatedAt = now;
        this.expiresAt = expiry;
    }

    public void expire() {
        this.status = PulseInsightStatus.DISMISSED;
        this.dismissedAt = Instant.now();
    }

    // ------------------------------------------------------------------ getters / setters

    public UUID getOrganizationId() {
        return organizationId;
    }

    public PulseInsightType getType() {
        return type;
    }

    public PulseInsightCategory getCategory() {
        return category;
    }

    public PulseInsightStatus getStatus() {
        return status;
    }

    public void setStatus(PulseInsightStatus status) {
        this.status = status;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getWhatHappened() {
        return whatHappened;
    }

    public void setWhatHappened(String whatHappened) {
        this.whatHappened = whatHappened;
    }

    public String getWhyItMatters() {
        return whyItMatters;
    }

    public void setWhyItMatters(String whyItMatters) {
        this.whyItMatters = whyItMatters;
    }

    public UUID getWhoShouldAct() {
        return whoShouldAct;
    }

    public void setWhoShouldAct(UUID whoShouldAct) {
        this.whoShouldAct = whoShouldAct;
    }

    public String getWhoShouldActLabel() {
        return whoShouldActLabel;
    }

    public void setWhoShouldActLabel(String whoShouldActLabel) {
        this.whoShouldActLabel = whoShouldActLabel;
    }

    public String getWhatToDo() {
        return whatToDo;
    }

    public void setWhatToDo(String whatToDo) {
        this.whatToDo = whatToDo;
    }

    public String getExpectedImpact() {
        return expectedImpact;
    }

    public void setExpectedImpact(String expectedImpact) {
        this.expectedImpact = expectedImpact;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public void setEntityId(UUID entityId) {
        this.entityId = entityId;
    }

    public String getEntityLabel() {
        return entityLabel;
    }

    public void setEntityLabel(String entityLabel) {
        this.entityLabel = entityLabel;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getDismissedAt() {
        return dismissedAt;
    }

    public UUID getDismissedBy() {
        return dismissedBy;
    }
}
