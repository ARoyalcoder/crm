package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import com.pawanputra.bos.support.api.TicketPriority;
import com.pawanputra.bos.support.api.TicketStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A customer support request, tracked from opening through to resolution.
 * Ticket numbers are auto-generated from a sequence and have the form {@code TKT-00001}.
 */
@Entity
@Table(name = "tickets")
public class Ticket extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "ticket_number", nullable = false, updatable = false, length = 20)
    private String ticketNumber;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "service_offering_id")
    private UUID serviceOfferingId;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private TicketPriority priority = TicketPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TicketStatus status = TicketStatus.OPEN;

    @Column(name = "assigned_user_id")
    private UUID assignedUserId;

    @Column(name = "assigned_user_name", length = 200)
    private String assignedUserName;

    @Column(name = "sla_id")
    private UUID slaId;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "first_response_at")
    private Instant firstResponseAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    protected Ticket() {
        // for JPA
    }

    public Ticket(UUID organizationId, String ticketNumber) {
        this.organizationId = organizationId;
        this.ticketNumber = ticketNumber;
    }

    /** Assigns the ticket to an agent and moves it to ASSIGNED status. */
    public void assignTo(UUID userId, String userName) {
        this.assignedUserId = userId;
        this.assignedUserName = userName;
        if (this.status == TicketStatus.OPEN) {
            this.status = TicketStatus.ASSIGNED;
        }
    }

    /** Records the first response time once, the first time it is called. */
    public void recordFirstResponse(Instant now) {
        if (this.firstResponseAt == null) {
            this.firstResponseAt = now;
        }
    }

    /** Marks the ticket as resolved and records when. */
    public void resolve(Instant now) {
        this.status = TicketStatus.RESOLVED;
        this.resolvedAt = now;
    }

    /** Closes the ticket permanently. */
    public void close() {
        this.status = TicketStatus.CLOSED;
    }

    /** Re-opens a resolved or closed ticket. */
    public void reopen() {
        this.status = TicketStatus.OPEN;
        this.resolvedAt = null;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getServiceOfferingId() {
        return serviceOfferingId;
    }

    public void setServiceOfferingId(UUID serviceOfferingId) {
        this.serviceOfferingId = serviceOfferingId;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public void setPriority(TicketPriority priority) {
        this.priority = priority;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public UUID getAssignedUserId() {
        return assignedUserId;
    }

    public String getAssignedUserName() {
        return assignedUserName;
    }

    public UUID getSlaId() {
        return slaId;
    }

    public void setSlaId(UUID slaId) {
        this.slaId = slaId;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public Instant getFirstResponseAt() {
        return firstResponseAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }
}
