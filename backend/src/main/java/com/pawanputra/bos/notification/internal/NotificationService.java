package com.pawanputra.bos.notification.internal;

import com.pawanputra.bos.notification.api.NotificationPort;
import com.pawanputra.bos.notification.api.NotificationType;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationService implements NotificationPort {

    private static final int UNREAD_FETCH_LIMIT = 50;

    private final NotificationRepository notifications;
    private final NotificationPreferenceRepository preferences;

    public NotificationService(
            NotificationRepository notifications,
            NotificationPreferenceRepository preferences) {
        this.notifications = notifications;
        this.preferences = preferences;
    }

    // ---- Commands ----

    /**
     * Creates and persists a new notification for the given recipient.
     *
     * @param entityType optional: "Invoice", "Ticket", etc.
     * @param entityId   optional: the related entity's id
     */
    @Override
    public void notify(
            UUID recipientUserId,
            NotificationType type,
            String title,
            String message,
            String entityType,
            UUID entityId,
            UUID organizationId) {
        notifications.save(new Notification(
                organizationId, recipientUserId, type, title, message, entityType, entityId));
    }

    /** Marks one notification as read. Throws if the notification does not belong to the user. */
    public Notification markRead(UUID id, UUID recipientUserId) {
        Notification notification = notifications.findByIdAndRecipientUserId(id, recipientUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));
        notification.markRead(Instant.now());
        return notifications.save(notification);
    }

    /** Marks all unread notifications for the user as read. Returns the number updated. */
    public int markAllRead(UUID userId, UUID organizationId) {
        return notifications.markAllReadForUser(userId, organizationId, Instant.now());
    }

    /**
     * Upserts a notification preference for one event type. If no row exists, it is created
     * with the given values; if one already exists, it is updated.
     */
    public NotificationPreference updatePreference(
            UUID userId, UUID organizationId, String eventType,
            boolean inAppEnabled, boolean emailEnabled) {
        return preferences.findByUserIdAndEventType(userId, eventType)
                .map(pref -> {
                    pref.update(inAppEnabled, emailEnabled);
                    return preferences.save(pref);
                })
                .orElseGet(() -> preferences.save(
                        new NotificationPreference(userId, eventType, inAppEnabled, emailEnabled, organizationId)));
    }

    // ---- Queries ----

    /** Up to 50 unread notifications, newest first. */
    @Transactional(readOnly = true)
    public List<Notification> getUnread(UUID userId, UUID organizationId) {
        return notifications
                .findAllByRecipientUserIdAndOrganizationIdAndReadFalseOrderByCreatedAtDesc(
                        userId, organizationId, PageRequest.of(0, UNREAD_FETCH_LIMIT));
    }

    /** All notifications paginated, newest first. */
    @Transactional(readOnly = true)
    public Page<Notification> getAll(UUID userId, UUID organizationId, Pageable pageable) {
        return notifications.findAllByRecipientUserIdAndOrganizationIdOrderByCreatedAtDesc(
                userId, organizationId, pageable);
    }

    /** Count of unread notifications; used by the bell badge. */
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId, UUID organizationId) {
        return notifications.countByRecipientUserIdAndOrganizationIdAndReadFalse(userId, organizationId);
    }

    /** All saved preferences for a user. */
    @Transactional(readOnly = true)
    public List<NotificationPreference> getPreferences(UUID userId) {
        return preferences.findAllByUserId(userId);
    }
}
