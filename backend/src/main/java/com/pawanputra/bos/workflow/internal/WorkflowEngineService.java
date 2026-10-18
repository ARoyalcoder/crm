package com.pawanputra.bos.workflow.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.events.api.BusinessEventOccurred;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.workflow.api.ExecutionStatus;
import com.pawanputra.bos.workflow.api.WorkflowStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Core workflow engine: finds matching rules, evaluates conditions, dispatches actions,
 * and records the result in the execution log.
 *
 * <p>{@link WorkflowEventListener} calls {@link #processEvent} asynchronously, so workflow
 * processing never blocks the main business transaction.
 */
@Service
@Transactional
public class WorkflowEngineService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEngineService.class);

    private final WorkflowRuleRepository ruleRepository;
    private final WorkflowExecutionLogRepository logRepository;
    private final WorkflowConditionEvaluator conditionEvaluator;
    private final WorkflowActionExecutor actionExecutor;
    private final ObjectMapper objectMapper;

    public WorkflowEngineService(
            WorkflowRuleRepository ruleRepository,
            WorkflowExecutionLogRepository logRepository,
            WorkflowConditionEvaluator conditionEvaluator,
            WorkflowActionExecutor actionExecutor,
            ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.logRepository = logRepository;
        this.conditionEvaluator = conditionEvaluator;
        this.actionExecutor = actionExecutor;
        this.objectMapper = objectMapper;
    }

    // ---- Event processing ----

    /**
     * Processes a business event: finds all ACTIVE rules for the event type, evaluates
     * conditions, executes actions, and logs the outcome.
     *
     * <p>Designed to run inside {@link WorkflowEventListener} which is {@code @Async},
     * so each rule is processed in its own transaction to isolate failures.
     */
    public void processEvent(BusinessEventOccurred event) {
        String eventTypeName = event.eventType().name();
        List<WorkflowRule> rules = ruleRepository
                .findAllByTriggerEventTypeAndStatus(eventTypeName, WorkflowStatus.ACTIVE);

        if (rules.isEmpty()) {
            return;
        }

        log.info("[WORKFLOW] Processing event {} for {} rule(s)", eventTypeName, rules.size());

        // Decode the event payload once for all rules
        Map<String, Object> payload = decodePayload(event.payload());

        for (WorkflowRule rule : rules) {
            try {
                processSingleRule(rule, event, payload);
            } catch (Exception e) {
                log.error("[WORKFLOW] Unexpected error processing rule {} ({})", rule.getId(), rule.getName(), e);
            }
        }
    }

    private void processSingleRule(
            WorkflowRule rule,
            BusinessEventOccurred event,
            Map<String, Object> payload) {

        // Phase 1: evaluate conditions
        WorkflowConditionEvaluator.EvaluationResult evalResult =
                conditionEvaluator.evaluate(rule.getConditions(), payload);

        String conditionsResultJson = toJson(evalResult.details());

        if (!evalResult.allPassed()) {
            logRepository.save(new WorkflowExecutionLog(
                    rule.getOrganizationId(),
                    rule.getId(),
                    event.recordId(),
                    ExecutionStatus.CONDITION_NOT_MET,
                    conditionsResultJson,
                    null,
                    null));
            return;
        }

        // Phase 2: execute actions
        List<Map<String, Object>> actions = decodeActions(rule.getActions());
        if (actions.isEmpty()) {
            logRepository.save(new WorkflowExecutionLog(
                    rule.getOrganizationId(),
                    rule.getId(),
                    event.recordId(),
                    ExecutionStatus.CONDITION_MET,
                    conditionsResultJson,
                    "[]",
                    "No actions defined"));
            return;
        }

        List<WorkflowActionExecutor.ActionResult> results = new ArrayList<>();
        boolean anyFailed = false;

        for (Map<String, Object> action : actions) {
            WorkflowActionExecutor.ActionResult result =
                    actionExecutor.execute(action, event, rule.getOrganizationId());
            results.add(result);
            if (!result.success()) {
                anyFailed = true;
            }
        }

        ExecutionStatus finalStatus = anyFailed
                ? ExecutionStatus.ACTION_FAILED
                : ExecutionStatus.ACTION_EXECUTED;

        String actionsResultJson = toJson(results);

        logRepository.save(new WorkflowExecutionLog(
                rule.getOrganizationId(),
                rule.getId(),
                event.recordId(),
                finalStatus,
                conditionsResultJson,
                actionsResultJson,
                anyFailed ? "One or more actions failed" : null));

        log.info("[WORKFLOW] Rule {} ({}) finished with status {}", rule.getId(), rule.getName(), finalStatus);
    }

    // ---- CRUD ----

    /** Creates a new workflow rule. */
    public WorkflowRule createRule(
            UUID organizationId,
            String name,
            String description,
            WorkflowStatus status,
            String triggerEventType,
            String conditions,
            String actions,
            String actor) {
        return ruleRepository.save(new WorkflowRule(
                organizationId, name, description, status, triggerEventType, conditions, actions, actor));
    }

    /** Returns all rules for an org, optionally filtered by status. */
    @Transactional(readOnly = true)
    public List<WorkflowRule> listRules(UUID organizationId, WorkflowStatus statusFilter) {
        if (statusFilter != null) {
            return ruleRepository.findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(
                    organizationId, statusFilter);
        }
        return ruleRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId);
    }

    /** Gets a rule by id, scoped to the org. Throws if not found. */
    @Transactional(readOnly = true)
    public WorkflowRule getRule(UUID organizationId, UUID id) {
        return ruleRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkflowRule", id));
    }

    /** Updates the content of a rule. Status is unchanged. */
    public WorkflowRule updateRule(
            UUID organizationId,
            UUID id,
            String name,
            String description,
            String triggerEventType,
            String conditions,
            String actions,
            String actor) {
        WorkflowRule rule = getRule(organizationId, id);
        rule.update(name, description, triggerEventType, conditions, actions, actor);
        return ruleRepository.save(rule);
    }

    /** Enables (sets ACTIVE) a rule. */
    public WorkflowRule enableRule(UUID organizationId, UUID id, String actor) {
        WorkflowRule rule = getRule(organizationId, id);
        rule.enable(actor);
        return ruleRepository.save(rule);
    }

    /** Disables (sets INACTIVE) a rule. */
    public WorkflowRule disableRule(UUID organizationId, UUID id, String actor) {
        WorkflowRule rule = getRule(organizationId, id);
        rule.disable(actor);
        return ruleRepository.save(rule);
    }

    /** Deletes a rule. */
    public void deleteRule(UUID organizationId, UUID id) {
        WorkflowRule rule = getRule(organizationId, id);
        ruleRepository.delete(rule);
    }

    /** Paginated execution log for a specific rule. */
    @Transactional(readOnly = true)
    public Page<WorkflowExecutionLog> getRuleExecutionLog(UUID ruleId, Pageable pageable) {
        return logRepository.findAllByRuleIdOrderByExecutedAtDesc(ruleId, pageable);
    }

    /** Paginated execution log for all rules in the org. */
    @Transactional(readOnly = true)
    public Page<WorkflowExecutionLog> getOrgExecutionLog(UUID organizationId, Pageable pageable) {
        return logRepository.findAllByOrganizationIdOrderByExecutedAtDesc(organizationId, pageable);
    }

    // ---- Helpers ----

    @SuppressWarnings("unchecked")
    private Map<String, Object> decodePayload(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Could not parse event payload as JSON map: {}", json);
            return Map.of();
        }
    }

    private List<Map<String, Object>> decodeActions(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.warn("Could not parse actions JSON: {}", json);
            return List.of();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }
}
