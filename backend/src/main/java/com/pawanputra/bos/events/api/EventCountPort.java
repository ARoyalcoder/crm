package com.pawanputra.bos.events.api;

import java.util.UUID;

/**
 * Public port for querying event counts from outside the events module.
 */
public interface EventCountPort {

    long countEvents(UUID actorId, BusinessEventType eventType, UUID organizationId);
}
