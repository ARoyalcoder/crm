package com.pawanputra.bos.workflow.api;

/**
 * The set of actions a workflow rule may execute.
 *
 * <p><strong>Safety contract:</strong> only values in this enum are ever executed —
 * there is no arbitrary code path, no script evaluation, no reflection.
 * The action executor dispatches exclusively on these values.
 */
public enum ActionType {
    /** Create a collection task for the invoice referenced by the triggering event. */
    CREATE_COLLECTION_TASK,
    /** Send an in-app notification to configured recipients (or org admins when none are configured). */
    SEND_NOTIFICATION,
    /** Create an activity/task record against the triggering entity. */
    CREATE_ACTIVITY_TASK,
    /** Log the execution only; no side effects. Useful for dry-run rules. */
    LOG_ONLY,
}
