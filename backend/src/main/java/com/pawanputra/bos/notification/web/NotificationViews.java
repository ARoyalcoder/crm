package com.pawanputra.bos.notification.web;

import com.pawanputra.bos.notification.api.NotificationType;
import com.pawanputra.bos.notification.internal.Notification;
import com.pawanputra.bos.notification.internal.NotificationPreference;
import java.time.Instant;
import java.util.UUID;

/** Immutable read-model records returned by the notification controllers. */
public final class NotificationViews {

    private NotificationViews() {
    }

    public record NotificationView(
            UUID id,
            UUID organizationId,
            UUID recipientUserId,
            NotificationType type,
            String title,
            String message,
            String entityType,
            UUID entityId,
            boolean read,
            Instant readAt,
            Instant createdAt) {

        public static NotificationView from(Notification n) {
            return new NotificationView(
                    n.getId(),
                    n.getOrganizationId(),
                    n.getRecipientUserId(),
                    n.getType(),
                    n.getTitle(),
                    n.getMessage(),
                    n.getEntityType(),
                    n.getEntityId(),
                    n.isRead(),
                    n.getReadAt(),
                    n.getCreatedAt());
        }
    }

    public record NotificationPreferenceView(
            UUID id,
            UUID userId,
            String eventType,
            boolean inAppEnabled,
            boolean emailEnabled,
            Instant updatedAt) {

        public static NotificationPreferenceView from(NotificationPreference p) {
            return new NotificationPreferenceView(
                    p.getId(),
                    p.getUserId(),
                    p.getEventType(),
                    p.isInAppEnabled(),
                    p.isEmailEnabled(),
                    p.getUpdatedAt());
        }
    }

    public record UnreadCountView(long count) {
    }
}
