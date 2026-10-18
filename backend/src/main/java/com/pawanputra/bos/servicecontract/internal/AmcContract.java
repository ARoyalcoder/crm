package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.AmcFrequency;
import com.pawanputra.bos.servicecontract.api.AmcStatus;
import com.pawanputra.bos.servicecontract.api.RenewalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "amc_contracts")
public class AmcContract {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "contract_number", nullable = false, length = 50)
    private String contractNumber;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "service_offering_id")
    private UUID serviceOfferingId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "contract_value", nullable = false, precision = 14, scale = 2)
    private BigDecimal contractValue;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private AmcFrequency frequency;

    @Column(name = "assigned_employee_id")
    private UUID assignedEmployeeId;

    @Column(name = "sla_id")
    private UUID slaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AmcStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "renewal_status", nullable = false, length = 20)
    private RenewalStatus renewalStatus;

    @Column(name = "terms", columnDefinition = "text")
    private String terms;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "renewed_from_id")
    private UUID renewedFromId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected AmcContract() {
    }

    public AmcContract(
            UUID organizationId,
            String contractNumber,
            UUID customerId,
            UUID serviceOfferingId,
            UUID projectId,
            BigDecimal contractValue,
            String currency,
            LocalDate startDate,
            LocalDate endDate,
            AmcFrequency frequency,
            UUID assignedEmployeeId,
            UUID slaId,
            String terms,
            String notes,
            String createdBy) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.contractNumber = contractNumber;
        this.customerId = customerId;
        this.serviceOfferingId = serviceOfferingId;
        this.projectId = projectId;
        this.contractValue = contractValue;
        this.currency = currency != null ? currency : "INR";
        this.startDate = startDate;
        this.endDate = endDate;
        this.frequency = frequency;
        this.assignedEmployeeId = assignedEmployeeId;
        this.slaId = slaId;
        this.status = AmcStatus.DRAFT;
        this.renewalStatus = RenewalStatus.NOT_DUE;
        this.terms = terms;
        this.notes = notes;
        this.createdAt = Instant.now();
        this.createdBy = createdBy;
        this.updatedAt = this.createdAt;
        this.updatedBy = createdBy;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getContractNumber() { return contractNumber; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public UUID getServiceOfferingId() { return serviceOfferingId; }
    public void setServiceOfferingId(UUID serviceOfferingId) { this.serviceOfferingId = serviceOfferingId; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public BigDecimal getContractValue() { return contractValue; }
    public void setContractValue(BigDecimal contractValue) { this.contractValue = contractValue; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public AmcFrequency getFrequency() { return frequency; }
    public void setFrequency(AmcFrequency frequency) { this.frequency = frequency; }
    public UUID getAssignedEmployeeId() { return assignedEmployeeId; }
    public void setAssignedEmployeeId(UUID assignedEmployeeId) { this.assignedEmployeeId = assignedEmployeeId; }
    public UUID getSlaId() { return slaId; }
    public void setSlaId(UUID slaId) { this.slaId = slaId; }
    public AmcStatus getStatus() { return status; }
    public void setStatus(AmcStatus status) { this.status = status; }
    public RenewalStatus getRenewalStatus() { return renewalStatus; }
    public void setRenewalStatus(RenewalStatus renewalStatus) { this.renewalStatus = renewalStatus; }
    public String getTerms() { return terms; }
    public void setTerms(String terms) { this.terms = terms; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getRenewedFromId() { return renewedFromId; }
    public void setRenewedFromId(UUID renewedFromId) { this.renewedFromId = renewedFromId; }
    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public long getVersion() { return version; }
}
