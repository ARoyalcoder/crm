package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.support.api.TicketPriority;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CRUD for SLA definitions. Each organisation manages its own SLA targets per priority level.
 */
@Service
@Transactional(readOnly = true)
public class SlaService {

    /** What the caller wants to create or update. */
    public record SlaCommand(
            String name,
            int responseTimeHours,
            int resolutionTimeHours,
            TicketPriority priority,
            boolean active) {
    }

    private final SlaRepository slas;

    SlaService(SlaRepository slas) {
        this.slas = slas;
    }

    public List<Sla> list(UUID organizationId) {
        return slas.findAllByOrganizationIdOrderByPriorityAscNameAsc(organizationId);
    }

    public Sla get(UUID id, UUID organizationId) {
        return slas.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("SLA", id));
    }

    @Transactional
    public Sla create(UUID organizationId, SlaCommand cmd) {
        Sla sla = new Sla(organizationId, cmd.name(), cmd.responseTimeHours(),
                cmd.resolutionTimeHours(), cmd.priority());
        sla.setActive(cmd.active());
        return slas.save(sla);
    }

    @Transactional
    public Sla update(UUID id, UUID organizationId, SlaCommand cmd) {
        Sla sla = get(id, organizationId);
        sla.setName(cmd.name());
        sla.setResponseTimeHours(cmd.responseTimeHours());
        sla.setResolutionTimeHours(cmd.resolutionTimeHours());
        sla.setPriority(cmd.priority());
        sla.setActive(cmd.active());
        return slas.save(sla);
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        Sla sla = get(id, organizationId);
        slas.delete(sla);
    }
}
