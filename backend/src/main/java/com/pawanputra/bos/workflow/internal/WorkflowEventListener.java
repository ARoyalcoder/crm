package com.pawanputra.bos.workflow.internal;

import com.pawanputra.bos.events.api.BusinessEventOccurred;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for every {@link BusinessEventOccurred} application event and forwards it to the
 * workflow engine for rule evaluation.
 *
 * <p>The method is annotated {@link Async} so the engine runs on a background thread and
 * never blocks the main business transaction that published the event.
 *
 * <p>Failures here are logged and swallowed — workflow processing must not cause the
 * originating operation to roll back.
 */
@Component
class WorkflowEventListener {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEventListener.class);

    private final WorkflowEngineService engine;

    WorkflowEventListener(WorkflowEngineService engine) {
        this.engine = engine;
    }

    @Async
    @EventListener
    public void onBusinessEvent(BusinessEventOccurred event) {
        try {
            engine.processEvent(event);
        } catch (Exception e) {
            log.error("[WORKFLOW] Unhandled exception processing event {} for entity {}",
                    event.eventType(), event.entityId(), e);
        }
    }
}
