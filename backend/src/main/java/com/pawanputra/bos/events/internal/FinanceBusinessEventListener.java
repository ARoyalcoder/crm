package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import com.pawanputra.bos.finance.api.FinanceEvents.PaymentRecordedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Example of how the event engine hooks into existing module events.
 *
 * <p>This listener reacts to a {@link PaymentRecordedEvent} published by the finance module and
 * records a {@link BusinessEventType#PAYMENT_RECEIVED} business event. Adding new listeners for
 * other modules follows the same pattern: one class, one {@code @TransactionalEventListener}
 * method, one call to {@link BusinessEventPublisher#record}.
 *
 * <p><strong>Prerequisite:</strong> {@code PaymentService} must publish
 * {@link PaymentRecordedEvent} via {@code DomainEventPublisher} after a payment is saved.
 */
@Component
class FinanceBusinessEventListener {

    private final BusinessEventPublisher businessEventPublisher;

    FinanceBusinessEventListener(BusinessEventPublisher businessEventPublisher) {
        this.businessEventPublisher = businessEventPublisher;
    }

    /**
     * Runs after the payment transaction commits so the business event is recorded only for
     * payments that actually persisted.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentRecorded(PaymentRecordedEvent event) {
        String payload = """
                {"paymentNumber":"%s","amount":%s,"customerId":"%s"}"""
                .formatted(event.paymentNumber(), event.amount(), event.customerId());

        businessEventPublisher.record(
                BusinessEventType.PAYMENT_RECEIVED,
                "Payment",
                event.paymentId(),
                event.actorId(),
                event.organizationId(),
                payload);
    }
}
