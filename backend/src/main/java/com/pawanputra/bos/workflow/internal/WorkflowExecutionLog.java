package com.pawanputra.bos.workflow.internal;

import com.pawanputra.bos.workflow.api.ExecutionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Append-only log of every execution attempt for every workflow rule.
 * Never modified after creation.
 */
@Entity
@Table(name = "workflow_execution_logs")
public class WorkflowExecutionLog {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "rule_id", nullable = false)
    private UUID ruleId;

    /** FK to business_events; null for non-event triggers or when the event record is unavailable. */
    @Column(name = "trigger_event_id")
    private UUID triggerEventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ExecutionStatus status;

    /** JSON: array of {field, operator, value, passed: true|false} objects. */
    @Column(name = "conditions_result", columnDefinition = "text")
    private String conditionsResult;

    /** JSON: array of {actionType, success: true|false, message: "…"} objects. */
    @Column(name = "actions_result", columnDefinition = "text")
    private String actionsResult;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WorkflowExecutionLog() {
        // for JPA
    }

    public WorkflowExecutionLog(
            UUID organizationId,
            UUID ruleId,
            UUID triggerEventId,
            ExecutionStatus status,
            String conditionsResult,
            String actionsResult,
            String errorMessage) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.ruleId = ruleId;
        this.triggerEventId = triggerEventId;
        this.status = status;
        this.conditionsResult = conditionsResult;
        this.actionsResult = actionsResult;
        this.errorMessage = errorMessage;
        this.executedAt = Instant.now();
        this.createdAt = this.executedAt;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getRuleId() { return ruleId; }
    public UUID getTriggerEventId() { return triggerEventId; }
    public ExecutionStatus getStatus() { return status; }
    public String getConditionsResult() { return conditionsResult; }
    public String getActionsResult() { return actionsResult; }
    public String getErrorMessage() { return errorMessage; }
    public Instant getExecutedAt() { return executedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
