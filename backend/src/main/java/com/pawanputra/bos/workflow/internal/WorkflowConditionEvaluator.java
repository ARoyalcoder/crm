package com.pawanputra.bos.workflow.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.workflow.api.ConditionOperator;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Purely functional condition evaluator.
 *
 * <p>No side effects, no database access, no reflection, no code evaluation.
 * Each condition JSON object has the shape: {@code {field, operator, value}}.
 *
 * <p>The payload is a flat {@code Map<String, Object>} decoded from the business event's
 * JSON blob. Fields are looked up by exact key name.
 */
@Component
class WorkflowConditionEvaluator {

    private static final Logger log = LoggerFactory.getLogger(WorkflowConditionEvaluator.class);

    private final ObjectMapper objectMapper;

    WorkflowConditionEvaluator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Evaluates the conditions JSON array against the given payload map.
     *
     * @param conditionsJson JSON string containing an array of condition objects
     * @param payload        flat map of the event payload fields
     * @return an EvaluationResult capturing pass/fail for each condition
     */
    EvaluationResult evaluate(String conditionsJson, Map<String, Object> payload) {
        if (conditionsJson == null || conditionsJson.isBlank() || conditionsJson.equals("[]")) {
            return new EvaluationResult(true, List.of());
        }

        List<Map<String, Object>> conditions;
        try {
            conditions = objectMapper.readValue(
                    conditionsJson, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse conditions JSON: {}", conditionsJson, e);
            return new EvaluationResult(false, List.of());
        }

        List<ConditionDetail> details = new ArrayList<>();
        boolean allPassed = true;

        for (Map<String, Object> condition : conditions) {
            String field = (String) condition.get("field");
            String operatorStr = (String) condition.get("operator");
            String expectedValue = condition.get("value") != null
                    ? String.valueOf(condition.get("value")) : null;

            ConditionOperator operator;
            try {
                operator = ConditionOperator.valueOf(operatorStr);
            } catch (Exception e) {
                log.warn("Unknown condition operator: {}", operatorStr);
                details.add(new ConditionDetail(field, operatorStr, expectedValue, false));
                allPassed = false;
                continue;
            }

            Object actualRaw = payload != null ? payload.get(field) : null;
            boolean passed = evaluateOne(operator, actualRaw, expectedValue);
            details.add(new ConditionDetail(field, operatorStr, expectedValue, passed));
            if (!passed) {
                allPassed = false;
            }
        }

        return new EvaluationResult(allPassed, details);
    }

    private boolean evaluateOne(ConditionOperator operator, Object actualRaw, String expected) {
        String actual = actualRaw != null ? String.valueOf(actualRaw) : null;

        return switch (operator) {
            case IS_NULL -> actual == null;
            case IS_NOT_NULL -> actual != null;
            case EQUALS -> actual != null && actual.equalsIgnoreCase(expected);
            case NOT_EQUALS -> actual == null || !actual.equalsIgnoreCase(expected);
            case CONTAINS -> actual != null && expected != null
                    && actual.toLowerCase().contains(expected.toLowerCase());
            case GREATER_THAN -> compareNumbers(actual, expected) > 0;
            case LESS_THAN -> compareNumbers(actual, expected) < 0;
        };
    }

    private int compareNumbers(String actual, String expected) {
        try {
            BigDecimal a = new BigDecimal(actual);
            BigDecimal b = new BigDecimal(expected);
            return a.compareTo(b);
        } catch (Exception e) {
            // Fall back to lexicographic comparison
            if (actual == null) return -1;
            if (expected == null) return 1;
            return actual.compareTo(expected);
        }
    }

    // ---- Result types ----

    record ConditionDetail(String field, String operator, String expectedValue, boolean passed) {}

    record EvaluationResult(boolean allPassed, List<ConditionDetail> details) {}
}
