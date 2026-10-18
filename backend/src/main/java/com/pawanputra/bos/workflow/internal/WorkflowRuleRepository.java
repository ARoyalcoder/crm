package com.pawanputra.bos.workflow.internal;

import com.pawanputra.bos.workflow.api.WorkflowStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, UUID> {

    List<WorkflowRule> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<WorkflowRule> findAllByOrganizationIdAndStatusOrderByCreatedAtDesc(
            UUID organizationId, WorkflowStatus status);

    /** Returns all ACTIVE rules that match the event type — used by the engine on each event. */
    List<WorkflowRule> findAllByTriggerEventTypeAndStatus(
            String triggerEventType, WorkflowStatus status);

    Optional<WorkflowRule> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
