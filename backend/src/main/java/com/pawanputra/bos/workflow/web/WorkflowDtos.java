package com.pawanputra.bos.workflow.web;

import com.pawanputra.bos.workflow.api.WorkflowStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request bodies for the workflow API. */
final class WorkflowDtos {

    private WorkflowDtos() {
    }

    /**
     * Request to create or replace a workflow rule.
     * {@code conditions} and {@code actions} are raw JSON strings
     * so the UI can pass them directly without extra serialization layers.
     */
    record SaveRuleRequest(
            @NotBlank @Size(max = 255) String name,
            String description,
            WorkflowStatus status,
            @NotBlank @Size(max = 100) String triggerEventType,
            /** JSON array string: [{field, operator, value}] */
            String conditions,
            /** JSON array string: [{actionType, params}] */
            @NotNull String actions) {
    }
}
