package com.pawanputra.bos.workflow.internal;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface WorkflowExecutionLogRepository extends JpaRepository<WorkflowExecutionLog, UUID> {

    /** All execution logs for a specific rule, newest first. */
    Page<WorkflowExecutionLog> findAllByRuleIdOrderByExecutedAtDesc(UUID ruleId, Pageable pageable);

    /** All execution logs for an organisation, newest first. */
    Page<WorkflowExecutionLog> findAllByOrganizationIdOrderByExecutedAtDesc(
            UUID organizationId, Pageable pageable);
}
