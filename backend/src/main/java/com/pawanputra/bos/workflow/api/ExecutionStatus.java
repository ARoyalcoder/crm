package com.pawanputra.bos.workflow.api;

/**
 * Status of one workflow execution attempt, recorded in {@code WorkflowExecutionLog}.
 */
public enum ExecutionStatus {
    /** The event matched the rule's trigger; condition evaluation not yet complete. */
    TRIGGERED,
    /** All conditions evaluated to true; action execution is in progress. */
    CONDITION_MET,
    /** At least one condition evaluated to false; execution stopped before actions. */
    CONDITION_NOT_MET,
    /** All actions executed successfully. */
    ACTION_EXECUTED,
    /** One or more actions failed; the error is recorded in errorMessage. */
    ACTION_FAILED,
}
