package com.pawanputra.bos.notification.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Per-user preference controlling whether a specific {@link com.pawanputra.bos.events.api.BusinessEventType}
 * generates an in-app or email notification.
 *
 * <p>A row is only present once the user has explicitly configured the preference; the service
 * falls back to sensible defaults (in-app enabled, email disabled) when no row exists.
 */
@Entity
@Table(name = "notification_preferences")
public class NotificationPreference {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /**
     * The name of the {@link com.pawanputra.bos.events.api.BusinessEventType} this preference
     * controls, e.g. {@code "PAYMENT_RECEIVED"}.
     */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "in_app_enabled", nullable = false)
    private boolean inAppEnabled = true;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled = false;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected NotificationPreference() {
        // for JPA
    }

    NotificationPreference(UUID userId, String eventType, boolean inAppEnabled,
                            boolean emailEnabled, UUID organizationId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.eventType = eventType;
        this.inAppEnabled = inAppEnabled;
        this.emailEnabled = emailEnabled;
        this.organizationId = organizationId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void update(boolean inAppEnabled, boolean emailEnabled) {
        this.inAppEnabled = inAppEnabled;
        this.emailEnabled = emailEnabled;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getEventType() { return eventType; }
    public boolean isInAppEnabled() { return inAppEnabled; }
    public boolean isEmailEnabled() { return emailEnabled; }
    public UUID getOrganizationId() { return organizationId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
