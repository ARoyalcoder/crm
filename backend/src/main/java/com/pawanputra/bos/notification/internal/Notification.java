package com.pawanputra.bos.notification.internal;

import com.pawanputra.bos.notification.api.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * An in-app notification delivered to one user. Notifications are created by
 * {@link NotificationService#notify} and never updated except to mark them as read.
 */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    /** The user who will see this notification in their bell/inbox. */
    @Column(name = "recipient_user_id", nullable = false)
    private UUID recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "text")
    private String message;

    /** Optional: the kind of domain object this notification is about, e.g. "Invoice". */
    @Column(name = "entity_type", length = 100)
    private String entityType;

    /** Optional: the ID of the domain object. */
    @Column(name = "entity_id")
    private UUID entityId;

    @Column(name = "read", nullable = false)
    private boolean read = false;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {
        // for JPA
    }

    Notification(
            UUID organizationId,
            UUID recipientUserId,
            NotificationType type,
            String title,
            String message,
            String entityType,
            UUID entityId) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.recipientUserId = recipientUserId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.entityType = entityType;
        this.entityId = entityId;
        this.read = false;
        this.createdAt = Instant.now();
    }

    /** Marks the notification as read if it is not already. */
    void markRead(Instant now) {
        if (!read) {
            this.read = true;
            this.readAt = now;
        }
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getRecipientUserId() { return recipientUserId; }
    public NotificationType getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public boolean isRead() { return read; }
    public Instant getReadAt() { return readAt; }
    public Instant getCreatedAt() { return createdAt; }
}
