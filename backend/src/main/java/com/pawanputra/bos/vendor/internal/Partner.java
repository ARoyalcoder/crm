package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.vendor.api.PartnerAccessLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * An external partner organisation that collaborates on specific projects or services.
 * Partners NEVER receive unrestricted CRM access — access is governed by {@link PartnerAccessLevel}.
 */
@Entity
@Table(name = "partners")
public class Partner {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "organization_name", nullable = false, length = 200)
    private String organizationName;

    @Column(name = "contact_email", nullable = false, length = 254)
    private String contactEmail;

    @Column(name = "contact_phone", nullable = false, length = 30)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_level", nullable = false, length = 30)
    private PartnerAccessLevel accessLevel = PartnerAccessLevel.READ_ONLY;

    /** Comma-separated UUIDs of projects this partner is allowed to access. */
    @Column(name = "assigned_project_ids", columnDefinition = "text")
    private String assignedProjectIds;

    @Column(name = "services", columnDefinition = "text")
    private String services;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    /** The platform user account linked to this partner, if any. */
    @Column(name = "user_id")
    private UUID userId;

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

    protected Partner() {
        // for JPA
    }

    public Partner(UUID organizationId, String organizationName, String contactEmail,
                   String contactPhone, PartnerAccessLevel accessLevel, String actor) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.organizationName = organizationName;
        this.contactEmail = contactEmail;
        this.contactPhone = contactPhone;
        this.accessLevel = accessLevel != null ? accessLevel : PartnerAccessLevel.READ_ONLY;
        this.active = true;
        this.createdAt = Instant.now();
        this.createdBy = actor;
        this.updatedAt = this.createdAt;
        this.updatedBy = actor;
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }

    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public PartnerAccessLevel getAccessLevel() { return accessLevel; }

    /**
     * Sets the access level. Partners can never have unrestricted access — this
     * method is the only way to change it and the service layer validates it.
     */
    public void setAccessLevel(PartnerAccessLevel accessLevel) {
        if (accessLevel == null) {
            throw new IllegalArgumentException("Partner access level must not be null");
        }
        this.accessLevel = accessLevel;
    }

    public String getAssignedProjectIds() { return assignedProjectIds; }
    public void setAssignedProjectIds(String assignedProjectIds) { this.assignedProjectIds = assignedProjectIds; }

    public String getServices() { return services; }
    public void setServices(String services) { this.services = services; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

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
