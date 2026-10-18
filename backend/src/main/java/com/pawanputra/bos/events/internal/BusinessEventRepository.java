package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessEventRepository extends JpaRepository<BusinessEventRecord, UUID> {

    /** Recent events across an organisation, newest first. Pageable limits the result. */
    List<BusinessEventRecord> findAllByOrganizationIdOrderByOccurredAtDesc(
            UUID organizationId, Pageable pageable);

    /** Full event history for a single domain record. */
    List<BusinessEventRecord> findAllByEntityTypeAndEntityIdOrderByOccurredAtDesc(
            String entityType, UUID entityId);

    /** Events of a specific type within a date range. */
    List<BusinessEventRecord> findAllByEventTypeAndOrganizationIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            BusinessEventType eventType, UUID organizationId, Instant from, Instant to);

    /** Count how many times an actor has triggered a specific event type in an organisation. */
    long countByActorIdAndEventTypeAndOrganizationId(
            UUID actorId, BusinessEventType eventType, UUID organizationId);
}
