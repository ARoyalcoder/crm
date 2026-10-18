package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.vendor.api.VendorStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * A vendor is an external supplier or service provider the organisation works with.
 * The scorecard, contacts and documents for a vendor are stored in separate tables.
 */
@Entity
@Table(name = "vendors")
public class Vendor {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "contact_email", nullable = false, length = 254)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Column(name = "address", columnDefinition = "text")
    private String address;

    /** Comma-separated or JSON array of service names provided by the vendor. */
    @Column(name = "services", columnDefinition = "text")
    private String services;

    /** Net payment terms in days, e.g. 30 for net-30. Null if not agreed. */
    @Column(name = "payment_terms_days")
    private Integer paymentTermsDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VendorStatus status = VendorStatus.ACTIVE;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

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

    protected Vendor() {
        // for JPA
    }

    public Vendor(UUID organizationId, String companyName, String contactEmail, String contactPhone, String actor) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.companyName = companyName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.status = VendorStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.createdBy = actor;
        this.updatedAt = this.createdAt;
        this.updatedBy = actor;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getServices() { return services; }
    public void setServices(String services) { this.services = services; }

    public Integer getPaymentTermsDays() { return paymentTermsDays; }
    public void setPaymentTermsDays(Integer paymentTermsDays) { this.paymentTermsDays = paymentTermsDays; }

    public VendorStatus getStatus() { return status; }
    public void setStatus(VendorStatus status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    public long getVersion() { return version; }
}
