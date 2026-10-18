package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Persisted record of one business event. This is an append-only log entry; it is never
 * updated after creation.
 *
 * <p>Other modules create entries by calling {@link BusinessEventPublisher#record} — they should
 * never construct this class directly.
 */
@Entity
@Table(name = "business_events")
public class BusinessEventRecord {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private BusinessEventType eventType;

    /** The kind of domain object the event is about, e.g. "Invoice", "Lead", "Project". */
    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    /** The ID of the domain object. */
    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    /** The user who triggered the event; {@code null} for system-generated events. */
    @Column(name = "actor_id")
    private UUID actorId;

    /** Optional JSON blob with extra context (amounts, status names, references, etc.). */
    @Column(name = "payload", columnDefinition = "text")
    private String payload;

    /** When the business fact occurred. May differ from {@link #createdAt} if written late. */
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    /** When this record was inserted into the database. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BusinessEventRecord() {
        // for JPA
    }

    BusinessEventRecord(
            BusinessEventType eventType,
            String entityType,
            UUID entityId,
            UUID organizationId,
            UUID actorId,
            String payload,
            Instant occurredAt) {
        this.id = UUID.randomUUID();
        this.eventType = eventType;
        this.entityType = entityType;
        this.entityId = entityId;
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.payload = payload;
        this.occurredAt = occurredAt;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public BusinessEventType getEventType() { return eventType; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getActorId() { return actorId; }
    public String getPayload() { return payload; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getCreatedAt() { return createdAt; }
}
