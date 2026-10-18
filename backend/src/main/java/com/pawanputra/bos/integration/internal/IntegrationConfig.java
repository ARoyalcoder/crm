package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.IntegrationStatus;
import com.pawanputra.bos.integration.api.IntegrationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Stores the external integration configuration for one integration type within an organisation.
 *
 * <p>{@code configJson} is an opaque encrypted blob; it is never returned through the API.
 * There is at most one row per {@code (organization_id, type)} pair.
 */
@Entity
@Table(name = "integration_configs")
public class IntegrationConfig {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private IntegrationType type;

    /** Provider identifier, e.g. {@code "SENDGRID"}, {@code "TWILIO"}, {@code "RAZORPAY"}. */
    @Column(name = "provider_name", length = 100)
    private String providerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IntegrationStatus status;

    /** Encrypted JSON blob containing provider credentials. Never exposed through the API. */
    @Column(name = "config_json", columnDefinition = "text")
    private String configJson;

    @Column(name = "last_tested_at")
    private Instant lastTestedAt;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected IntegrationConfig() {
        // for JPA
    }

    public IntegrationConfig(UUID organizationId, IntegrationType type, String providerName,
            String configJson, String actor) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.type = type;
        this.providerName = providerName;
        this.status = IntegrationStatus.NOT_CONFIGURED;
        this.configJson = configJson;
        this.enabled = false;
        this.createdBy = actor;
        this.updatedBy = actor;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    // ---- Getters ----

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public IntegrationType getType() { return type; }
    public String getProviderName() { return providerName; }
    public IntegrationStatus getStatus() { return status; }
    public String getConfigJson() { return configJson; }
    public Instant getLastTestedAt() { return lastTestedAt; }
    public String getLastError() { return lastError; }
    public boolean isEnabled() { return enabled; }
    public String getCreatedBy() { return createdBy; }
    public String getUpdatedBy() { return updatedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // ---- Mutators ----

    public void updateConfig(String providerName, String configJson, String actor) {
        this.providerName = providerName;
        this.configJson = configJson;
        this.status = IntegrationStatus.DISCONNECTED;
        this.lastError = null;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public void enable(String actor) {
        this.enabled = true;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public void disable(String actor) {
        this.enabled = false;
        this.status = IntegrationStatus.DISCONNECTED;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public void recordTestResult(boolean success, String errorMessage, String actor) {
        this.lastTestedAt = Instant.now();
        this.status = success ? IntegrationStatus.CONNECTED : IntegrationStatus.ERROR;
        this.lastError = success ? null : errorMessage;
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }
}
