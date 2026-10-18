package com.pawanputra.bos.workflow.api;

/**
 * The comparison operator used in a workflow condition clause.
 * Evaluation is purely functional — no reflection or code execution.
 */
public enum ConditionOperator {
    EQUALS,
    NOT_EQUALS,
    GREATER_THAN,
    LESS_THAN,
    CONTAINS,
    IS_NULL,
    IS_NOT_NULL,
}
