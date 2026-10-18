package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import com.pawanputra.bos.support.api.TicketPriority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * A service-level agreement definition: how quickly a ticket of a given priority must be
 * responded to and resolved. Organisations can define one SLA per priority level.
 */
@Entity
@Table(name = "sla_definitions")
public class Sla extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "response_time_hours", nullable = false)
    private int responseTimeHours;

    @Column(name = "resolution_time_hours", nullable = false)
    private int resolutionTimeHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private TicketPriority priority;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected Sla() {
        // for JPA
    }

    public Sla(UUID organizationId, String name, int responseTimeHours, int resolutionTimeHours,
            TicketPriority priority) {
        this.organizationId = organizationId;
        this.name = name;
        this.responseTimeHours = responseTimeHours;
        this.resolutionTimeHours = resolutionTimeHours;
        this.priority = priority;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getResponseTimeHours() {
        return responseTimeHours;
    }

    public void setResponseTimeHours(int responseTimeHours) {
        this.responseTimeHours = responseTimeHours;
    }

    public int getResolutionTimeHours() {
        return resolutionTimeHours;
    }

    public void setResolutionTimeHours(int resolutionTimeHours) {
        this.resolutionTimeHours = resolutionTimeHours;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public void setPriority(TicketPriority priority) {
        this.priority = priority;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
