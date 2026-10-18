package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventOccurred;
import com.pawanputra.bos.events.api.BusinessEventType;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The single entry point for recording business events. Each call:
 * <ol>
 *   <li>Persists a {@link BusinessEventRecord} in the database so the event is auditable.</li>
 *   <li>Publishes a Spring application event ({@link BusinessEventOccurred}) so other components
 *       in the same process can react with {@code @EventListener}.</li>
 * </ol>
 *
 * <p>Other modules should call this component when a significant action completes:
 * <pre>{@code
 *   businessEventPublisher.record(
 *       BusinessEventType.PAYMENT_RECEIVED,
 *       "Payment", payment.getId(),
 *       actorId, organizationId,
 *       "{\"amount\": 5000}");
 * }</pre>
 */
@Component
public class BusinessEventPublisher {

    private final BusinessEventService service;
    private final ApplicationEventPublisher applicationEvents;

    public BusinessEventPublisher(
            BusinessEventService service,
            ApplicationEventPublisher applicationEvents) {
        this.service = service;
        this.applicationEvents = applicationEvents;
    }

    /**
     * Records the event and publishes a {@link BusinessEventOccurred} notification.
     *
     * @param eventType    what happened
     * @param entityType   the kind of domain object ("Invoice", "Lead", "Project", …)
     * @param entityId     the id of that domain object
     * @param actorId      the user who triggered the event; {@code null} for system events
     * @param organizationId the organisation the event belongs to
     * @param payload      optional JSON with extra context; pass {@code null} if none
     */
    @Transactional
    public BusinessEventRecord record(
            BusinessEventType eventType,
            String entityType,
            UUID entityId,
            UUID actorId,
            UUID organizationId,
            String payload) {

        BusinessEventRecord saved = service.record(
                eventType, entityType, entityId, actorId, organizationId, payload);

        applicationEvents.publishEvent(
                new BusinessEventOccurred(saved.getId(), eventType, entityType, entityId,
                        organizationId, actorId, payload, saved.getOccurredAt()));

        return saved;
    }
}
