package com.pawanputra.bos.notification.web;

/** Request bodies accepted by the notification controllers. */
final class NotificationDtos {

    private NotificationDtos() {
    }

    record UpdatePreferenceRequest(
            boolean inAppEnabled,
            boolean emailEnabled) {
    }
}
