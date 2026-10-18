package com.pawanputra.bos.finance.api;

import com.pawanputra.bos.platform.event.DomainEvent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Domain events published by the finance module. Other modules subscribe with
 * {@code @EventListener} or {@code @TransactionalEventListener}.
 *
 * <p>Publish via {@code DomainEventPublisher.publish(PaymentRecordedEvent.of(…))} inside
 * {@code PaymentService} after a payment is successfully persisted.
 */
public final class FinanceEvents {

    private FinanceEvents() {
    }

    /**
     * A payment has been recorded and allocated. Published after the transaction commits.
     * Listeners may use this to update dashboards, trigger follow-up tasks, or record a
     * {@link com.pawanputra.bos.events.api.BusinessEventType#PAYMENT_RECEIVED} business event.
     */
    public record PaymentRecordedEvent(
            UUID eventId,
            Instant occurredAt,
            UUID paymentId,
            UUID organizationId,
            String paymentNumber,
            BigDecimal amount,
            UUID customerId,
            UUID actorId) implements DomainEvent {

        public static PaymentRecordedEvent of(
                UUID paymentId,
                UUID organizationId,
                String paymentNumber,
                BigDecimal amount,
                UUID customerId,
                UUID actorId) {
            return new PaymentRecordedEvent(
                    UUID.randomUUID(), Instant.now(),
                    paymentId, organizationId, paymentNumber, amount, customerId, actorId);
        }
    }
}
