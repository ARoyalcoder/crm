package com.pawanputra.bos.recruitment.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import com.pawanputra.bos.recruitment.api.ApplicationStage;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A candidate's application for a specific job opening.
 */
@Entity
@Table(name = "applications")
public class Application extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "job_id", nullable = false, updatable = false)
    private UUID jobId;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 20)
    private ApplicationStage stage = ApplicationStage.APPLIED;

    @Column(name = "applied_date", nullable = false)
    private LocalDate appliedDate;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "stage_notes", columnDefinition = "text")
    private String stageNotes;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "offer_salary", precision = 15, scale = 2)
    private BigDecimal offerSalary;

    protected Application() {
        // for JPA
    }

    public Application(UUID organizationId, UUID jobId, UUID candidateId) {
        this.organizationId = organizationId;
        this.jobId = jobId;
        this.candidateId = candidateId;
        this.appliedDate = LocalDate.now();
    }

    public UUID getOrganizationId() {
        return organizationId;
    }

    public UUID getJobId() {
        return jobId;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public ApplicationStage getStage() {
        return stage;
    }

    public void setStage(ApplicationStage stage) {
        this.stage = stage;
    }

    public LocalDate getAppliedDate() {
        return appliedDate;
    }

    public void setAppliedDate(LocalDate appliedDate) {
        this.appliedDate = appliedDate;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public String getStageNotes() {
        return stageNotes;
    }

    public void setStageNotes(String stageNotes) {
        this.stageNotes = stageNotes;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public BigDecimal getOfferSalary() {
        return offerSalary;
    }

    public void setOfferSalary(BigDecimal offerSalary) {
        this.offerSalary = offerSalary;
    }
}
