package com.pawanputra.bos.notification.api;

import java.util.UUID;

/**
 * Public port for publishing in-app notifications from any module.
 */
public interface NotificationPort {

    /**
     * Creates and persists a new notification for the given recipient.
     *
     * @param recipientUserId recipient's user id
     * @param type            notification type
     * @param title           title text
     * @param message         detailed message text
     * @param entityType      optional related entity type (e.g. "Invoice", "Ticket")
     * @param entityId        optional related entity id
     * @param organizationId  organization id
     */
    void notify(
            UUID recipientUserId,
            NotificationType type,
            String title,
            String message,
            String entityType,
            UUID entityId,
            UUID organizationId);
}
