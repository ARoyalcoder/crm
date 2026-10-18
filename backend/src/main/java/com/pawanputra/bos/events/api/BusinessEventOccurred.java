package com.pawanputra.bos.events.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Spring application event published after a BusinessEventRecord is persisted.
 *
 * <p>Consume with {@code @EventListener} (or {@code @TransactionalEventListener} if you need the
 * outer transaction to have committed first):
 *
 * <pre>{@code
 * @EventListener
 * public void on(BusinessEventOccurred event) {
 *     if (event.eventType() == BusinessEventType.PAYMENT_RECEIVED) { ... }
 * }
 * }</pre>
 */
public record BusinessEventOccurred(
        UUID recordId,
        BusinessEventType eventType,
        String entityType,
        UUID entityId,
        UUID organizationId,
        UUID actorId,
        String payload,
        Instant occurredAt) {
}
