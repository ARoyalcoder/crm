package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.events.api.BusinessEventOccurred;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for {@link BusinessEventOccurred} application events and processes reward rules.
 *
 * <p>The handler is {@link Async} so it never blocks the originating transaction.
 * Failures are logged and swallowed — reward processing must not roll back business operations.
 *
 * <p>Customer point rules (configurable points hardcoded here; a future enhancement would make
 * these configurable per-org the same way achievement rules are):
 * <ul>
 *   <li>PROJECT_COMPLETED → 100 pts for the customer</li>
 *   <li>AMC_RENEWED → 50 pts for the customer</li>
 *   <li>PAYMENT_RECEIVED → 25 pts for the customer</li>
 * </ul>
 *
 * <p>Employee achievement rules are driven by configured {@link AchievementRule}s queried via
 * {@link AchievementService}.
 */
@Component
class RewardEventListener {

    private static final Logger log = LoggerFactory.getLogger(RewardEventListener.class);

    private final AchievementService achievements;
    private final CustomerRewardService customerRewards;

    RewardEventListener(AchievementService achievements,
                         CustomerRewardService customerRewards) {
        this.achievements = achievements;
        this.customerRewards = customerRewards;
    }

    @Async
    @EventListener
    public void onBusinessEvent(BusinessEventOccurred event) {
        try {
            handleEmployeeAchievements(event);
        } catch (Exception e) {
            log.error("[REWARDS] Unhandled exception in employee achievements for event {} entity {}",
                    event.eventType(), event.entityId(), e);
        }
        try {
            handleCustomerRewards(event);
        } catch (Exception e) {
            log.error("[REWARDS] Unhandled exception in customer rewards for event {} entity {}",
                    event.eventType(), event.entityId(), e);
        }
    }

    // ---- Employee achievements -----------------------------------------------

    private void handleEmployeeAchievements(BusinessEventOccurred event) {
        if (event.actorId() == null) {
            return;
        }
        achievements.processEvent(event.actorId(), event.eventType(), event.entityId(), event.organizationId());
    }

    // ---- Customer rewards ----------------------------------------------------

    private void handleCustomerRewards(BusinessEventOccurred event) {
        // Customer-facing events: entityId is the entity that was completed/renewed/paid.
        // The payload would carry the customerId in a fully integrated implementation;
        // here we use entityId as a proxy until the calling modules pass a customerId in the payload.
        // Only fire for significant achievement/opportunity-type events (not trivial ones).

        switch (event.eventType()) {
            case PROJECT_COMPLETED -> {
                if (event.entityId() != null) {
                    try {
                        customerRewards.addPoints(
                                event.entityId(), 100, "Project Completed",
                                "PROJECT", event.entityId(), event.organizationId());
                    } catch (Exception e) {
                        log.warn("[REWARDS] Could not award project completion points for entity {}",
                                event.entityId(), e);
                    }
                }
            }
            case AMC_RENEWED -> {
                if (event.entityId() != null) {
                    try {
                        customerRewards.addPoints(
                                event.entityId(), 50, "AMC Renewal",
                                "AMC_CONTRACT", event.entityId(), event.organizationId());
                    } catch (Exception e) {
                        log.warn("[REWARDS] Could not award AMC renewal points for entity {}",
                                event.entityId(), e);
                    }
                }
            }
            case PAYMENT_RECEIVED -> {
                if (event.entityId() != null) {
                    try {
                        customerRewards.addPoints(
                                event.entityId(), 25, "Payment Received",
                                "PAYMENT", event.entityId(), event.organizationId());
                    } catch (Exception e) {
                        log.warn("[REWARDS] Could not award payment points for entity {}",
                                event.entityId(), e);
                    }
                }
            }
            default -> {
                // No customer reward for other event types
            }
        }
    }
}
