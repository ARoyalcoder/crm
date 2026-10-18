package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.VisitStatus;
import com.pawanputra.bos.servicecontract.api.VisitType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "amc_service_visits")
public class AmcServiceVisit {

    @Id
    private UUID id;

    @Column(name = "contract_id", nullable = false)
    private UUID contractId;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "visit_type", nullable = false, length = 20)
    private VisitType visitType;

    @Column(name = "assigned_employee_id")
    private UUID assignedEmployeeId;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "outcome", columnDefinition = "text")
    private String outcome;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VisitStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AmcServiceVisit() {
    }

    public AmcServiceVisit(
            UUID contractId,
            LocalDate scheduledDate,
            VisitType visitType,
            UUID assignedEmployeeId,
            String notes) {
        this.id = UUID.randomUUID();
        this.contractId = contractId;
        this.scheduledDate = scheduledDate;
        this.visitType = visitType != null ? visitType : VisitType.SCHEDULED;
        this.assignedEmployeeId = assignedEmployeeId;
        this.notes = notes;
        this.status = VisitStatus.SCHEDULED;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public UUID getContractId() { return contractId; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }
    public LocalDate getCompletedDate() { return completedDate; }
    public void setCompletedDate(LocalDate completedDate) { this.completedDate = completedDate; }
    public VisitType getVisitType() { return visitType; }
    public void setVisitType(VisitType visitType) { this.visitType = visitType; }
    public UUID getAssignedEmployeeId() { return assignedEmployeeId; }
    public void setAssignedEmployeeId(UUID assignedEmployeeId) { this.assignedEmployeeId = assignedEmployeeId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }
    public VisitStatus getStatus() { return status; }
    public void setStatus(VisitStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
