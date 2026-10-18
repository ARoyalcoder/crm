package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads and writes {@link BusinessEventRecord}s. Writes go through
 * {@link BusinessEventPublisher#record} which also fires a Spring application event;
 * this service exposes only the query side directly.
 */
@Service
@Transactional(readOnly = true)
public class BusinessEventService {

    private final BusinessEventRepository repository;

    public BusinessEventService(BusinessEventRepository repository) {
        this.repository = repository;
    }

    /**
     * Persists one event record. Called by {@link BusinessEventPublisher}; other code should
     * call the publisher rather than this service directly.
     */
    @Transactional
    public BusinessEventRecord record(
            BusinessEventType eventType,
            String entityType,
            UUID entityId,
            UUID actorId,
            UUID organizationId,
            String payload) {
        return repository.save(new BusinessEventRecord(
                eventType, entityType, entityId, organizationId, actorId, payload, Instant.now()));
    }

    /** The {@code limit} most-recent events across the organisation, newest first. */
    public List<BusinessEventRecord> findRecent(UUID organizationId, int limit) {
        return repository.findAllByOrganizationIdOrderByOccurredAtDesc(
                organizationId, PageRequest.of(0, limit));
    }

    /** All events for a specific domain record, newest first. */
    public List<BusinessEventRecord> findByEntity(String entityType, UUID entityId) {
        return repository.findAllByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId);
    }

    /** Events of a specific type within an inclusive date range. */
    public List<BusinessEventRecord> findByType(
            UUID organizationId, BusinessEventType eventType, Instant from, Instant to) {
        return repository
                .findAllByEventTypeAndOrganizationIdAndOccurredAtBetweenOrderByOccurredAtDesc(
                        eventType, organizationId, from, to);
    }
}
