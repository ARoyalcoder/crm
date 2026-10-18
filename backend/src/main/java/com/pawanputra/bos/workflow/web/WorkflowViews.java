package com.pawanputra.bos.workflow.web;

import com.pawanputra.bos.workflow.api.ExecutionStatus;
import com.pawanputra.bos.workflow.api.WorkflowStatus;
import com.pawanputra.bos.workflow.internal.WorkflowExecutionLog;
import com.pawanputra.bos.workflow.internal.WorkflowRule;
import java.time.Instant;
import java.util.UUID;

/** Immutable read-model records returned by the workflow controller. */
public final class WorkflowViews {

    private WorkflowViews() {
    }

    public record WorkflowRuleView(
            UUID id,
            UUID organizationId,
            String name,
            String description,
            WorkflowStatus status,
            String triggerEventType,
            String conditions,
            String actions,
            String createdBy,
            String updatedBy,
            Instant createdAt,
            Instant updatedAt) {

        public static WorkflowRuleView from(WorkflowRule r) {
            return new WorkflowRuleView(
                    r.getId(),
                    r.getOrganizationId(),
                    r.getName(),
                    r.getDescription(),
                    r.getStatus(),
                    r.getTriggerEventType(),
                    r.getConditions(),
                    r.getActions(),
                    r.getCreatedBy(),
                    r.getUpdatedBy(),
                    r.getCreatedAt(),
                    r.getUpdatedAt());
        }
    }

    public record WorkflowExecutionLogView(
            UUID id,
            UUID organizationId,
            UUID ruleId,
            UUID triggerEventId,
            ExecutionStatus status,
            String conditionsResult,
            String actionsResult,
            String errorMessage,
            Instant executedAt,
            Instant createdAt) {

        public static WorkflowExecutionLogView from(WorkflowExecutionLog l) {
            return new WorkflowExecutionLogView(
                    l.getId(),
                    l.getOrganizationId(),
                    l.getRuleId(),
                    l.getTriggerEventId(),
                    l.getStatus(),
                    l.getConditionsResult(),
                    l.getActionsResult(),
                    l.getErrorMessage(),
                    l.getExecutedAt(),
                    l.getCreatedAt());
        }
    }
}
