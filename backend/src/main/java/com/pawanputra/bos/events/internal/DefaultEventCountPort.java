package com.pawanputra.bos.events.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import com.pawanputra.bos.events.api.EventCountPort;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DefaultEventCountPort implements EventCountPort {

    private final BusinessEventRepository repository;

    public DefaultEventCountPort(BusinessEventRepository repository) {
        this.repository = repository;
    }

    @Override
    public long countEvents(UUID actorId, BusinessEventType eventType, UUID organizationId) {
        return repository.countByActorIdAndEventTypeAndOrganizationId(actorId, eventType, organizationId);
    }
}
