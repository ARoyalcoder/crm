package com.pawanputra.bos.workflow.internal;

import com.pawanputra.bos.workflow.api.WorkflowStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A configured automation rule. When the platform fires a {@code BusinessEventOccurred}
 * whose {@code eventType} matches {@link #triggerEventType}, the engine evaluates
 * {@link #conditions} and, if they pass, runs every entry in {@link #actions}.
 *
 * <p>Conditions are stored as a JSON array of objects:
 * {@code [{"field":"amount","operator":"GREATER_THAN","value":"50000"}]}
 *
 * <p>Actions are stored as a JSON array of objects:
 * {@code [{"actionType":"SEND_NOTIFICATION","params":{"title":"…","type":"CRITICAL"}}]}
 */
@Entity
@Table(name = "workflow_rules")
public class WorkflowRule {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WorkflowStatus status;

    /** Stored as {@code BusinessEventType.name()} so it survives enum renames. */
    @Column(name = "trigger_event_type", nullable = false, length = 100)
    private String triggerEventType;

    /** JSON array: [{field, operator, value}]. Empty array means no conditions (always runs). */
    @Column(name = "conditions", columnDefinition = "text")
    private String conditions;

    /** JSON array: [{actionType, params}]. */
    @Column(name = "actions", columnDefinition = "text", nullable = false)
    private String actions;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WorkflowRule() {
        // for JPA
    }

    public WorkflowRule(
            UUID organizationId,
            String name,
            String description,
            WorkflowStatus status,
            String triggerEventType,
            String conditions,
            String actions,
            String actor) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.name = name;
        this.description = description;
        this.status = status != null ? status : WorkflowStatus.DRAFT;
        this.triggerEventType = triggerEventType;
        this.conditions = conditions;
        this.actions = actions;
        this.createdBy = actor;
        this.updatedBy = actor;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    // ---- Getters ----

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public WorkflowStatus getStatus() { return status; }
    public String getTriggerEventType() { return triggerEventType; }
    public String getConditions() { return conditions; }
    public String getActions() { return actions; }
    public String getCreatedBy() { return createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // ---- Mutators ----

    public void update(String name, String description, String triggerEventType,
                       String conditions, String actions, String actor) {
        this.name = name;
        this.description = description;
        this.triggerEventType = triggerEventType;
        this.conditions = conditions;
        this.actions = actions;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public void enable(String actor) {
        this.status = WorkflowStatus.ACTIVE;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public void disable(String actor) {
        this.status = WorkflowStatus.INACTIVE;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }
}
