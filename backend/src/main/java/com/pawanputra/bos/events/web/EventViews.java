package com.pawanputra.bos.events.web;

import com.pawanputra.bos.events.api.BusinessEventType;
import com.pawanputra.bos.events.internal.BusinessEventRecord;
import java.time.Instant;
import java.util.UUID;

/** Immutable read-model records returned by the event controllers. */
public final class EventViews {

    private EventViews() {
    }

    public record BusinessEventView(
            UUID id,
            BusinessEventType eventType,
            String entityType,
            UUID entityId,
            UUID organizationId,
            UUID actorId,
            String payload,
            Instant occurredAt,
            Instant createdAt) {

        public static BusinessEventView from(BusinessEventRecord r) {
            return new BusinessEventView(
                    r.getId(),
                    r.getEventType(),
                    r.getEntityType(),
                    r.getEntityId(),
                    r.getOrganizationId(),
                    r.getActorId(),
                    r.getPayload(),
                    r.getOccurredAt(),
                    r.getCreatedAt());
        }
    }
}
