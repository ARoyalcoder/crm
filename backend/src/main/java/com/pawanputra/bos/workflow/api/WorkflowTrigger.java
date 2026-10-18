package com.pawanputra.bos.workflow.api;

/**
 * How a workflow rule is triggered. Only EVENT_BASED is active now;
 * SCHEDULED is reserved for a future cron-based trigger.
 */
public enum WorkflowTrigger {
    EVENT_BASED,
    SCHEDULED,
}
