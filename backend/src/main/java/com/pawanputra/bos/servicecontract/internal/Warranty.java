package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.WarrantyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "warranties")
public class Warranty {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "service_offering_id")
    private UUID serviceOfferingId;

    @Column(name = "description", nullable = false, length = 500)
    private String description;

    @Column(name = "terms", columnDefinition = "text")
    private String terms;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private WarrantyStatus status;

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

    protected Warranty() {
    }

    public Warranty(
            UUID organizationId,
            UUID customerId,
            UUID orderId,
            UUID projectId,
            UUID serviceOfferingId,
            String description,
            String terms,
            LocalDate startDate,
            LocalDate endDate,
            String createdBy) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.customerId = customerId;
        this.orderId = orderId;
        this.projectId = projectId;
        this.serviceOfferingId = serviceOfferingId;
        this.description = description;
        this.terms = terms;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = WarrantyStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.createdBy = createdBy;
        this.updatedAt = this.createdAt;
        this.updatedBy = createdBy;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID customerId) { this.customerId = customerId; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }
    public UUID getProjectId() { return projectId; }
    public void setProjectId(UUID projectId) { this.projectId = projectId; }
    public UUID getServiceOfferingId() { return serviceOfferingId; }
    public void setServiceOfferingId(UUID serviceOfferingId) { this.serviceOfferingId = serviceOfferingId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTerms() { return terms; }
    public void setTerms(String terms) { this.terms = terms; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public WarrantyStatus getStatus() { return status; }
    public void setStatus(WarrantyStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public long getVersion() { return version; }
}
