package com.pawanputra.bos.finance.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A manual follow-up task linked to an outstanding invoice. Created by a staff member or
 * automatically by {@link CollectionAutomationJob} when an invoice becomes overdue.
 */
@Entity
@Table(name = "collection_tasks")
public class CollectionTask extends AuditableEntity {

    public enum Priority { LOW, MEDIUM, HIGH, CRITICAL }

    public enum Status { OPEN, IN_PROGRESS, COMPLETED, CANCELLED }

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "invoice_id", nullable = false, updatable = false)
    private UUID invoiceId;

    /** Denormalized from the invoice for query performance. */
    @Column(name = "customer_id", nullable = false, updatable = false)
    private UUID customerId;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.OPEN;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected CollectionTask() {
        // for JPA
    }

    public CollectionTask(UUID organizationId, UUID invoiceId, UUID customerId) {
        this.organizationId = organizationId;
        this.invoiceId = invoiceId;
        this.customerId = customerId;
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getInvoiceId() {
        return invoiceId;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
