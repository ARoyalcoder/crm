package com.pawanputra.bos.vendor.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A named contact person at a vendor. One per vendor can be marked primary. */
@Entity
@Table(name = "vendor_contacts")
public class VendorContact {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "vendor_id", nullable = false, updatable = false)
    private UUID vendorId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "email", nullable = false, length = 254)
    private String email;

    @Column(name = "phone", nullable = false, length = 30)
    private String phone;

    @Column(name = "designation", length = 150)
    private String designation;

    @Column(name = "primary_contact", nullable = false)
    private boolean primaryContact = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected VendorContact() {
        // for JPA
    }

    public VendorContact(UUID vendorId, String name, String email, String phone, String designation, boolean primaryContact) {
        this.id = UUID.randomUUID();
        this.vendorId = vendorId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.designation = designation;
        this.primaryContact = primaryContact;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public UUID getVendorId() { return vendorId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public boolean isPrimaryContact() { return primaryContact; }
    public void setPrimaryContact(boolean primaryContact) { this.primaryContact = primaryContact; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
