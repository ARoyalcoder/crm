package com.pawanputra.bos.notification.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.notification.internal.NotificationService;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/notifications")
@Tag(name = "Notifications")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class NotificationController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.NOTIFICATION_VIEW + "')";

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all notifications for the current user, paginated, newest first")
    public Page<NotificationViews.NotificationView> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        CurrentUser user = CurrentUser.require();
        return notificationService
                .getAll(user.id(), user.organizationId(), PageRequest.of(page, Math.min(size, 100)))
                .map(NotificationViews.NotificationView::from);
    }

    @GetMapping("/unread")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List unread notifications for the current user (up to 50)")
    public List<NotificationViews.NotificationView> getUnread() {
        CurrentUser user = CurrentUser.require();
        return notificationService.getUnread(user.id(), user.organizationId())
                .stream()
                .map(NotificationViews.NotificationView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/unread-count")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Count of unread notifications for the bell badge")
    public NotificationViews.UnreadCountView getUnreadCount() {
        CurrentUser user = CurrentUser.require();
        return new NotificationViews.UnreadCountView(
                notificationService.getUnreadCount(user.id(), user.organizationId()));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Mark one notification as read")
    public NotificationViews.NotificationView markRead(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return NotificationViews.NotificationView.from(
                notificationService.markRead(id, user.id()));
    }

    @PutMapping("/read-all")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Mark all notifications as read for the current user")
    public NotificationViews.UnreadCountView markAllRead() {
        CurrentUser user = CurrentUser.require();
        notificationService.markAllRead(user.id(), user.organizationId());
        return new NotificationViews.UnreadCountView(0);
    }

    @GetMapping("/preferences")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get the current user's notification preferences")
    public List<NotificationViews.NotificationPreferenceView> getPreferences() {
        CurrentUser user = CurrentUser.require();
        return notificationService.getPreferences(user.id())
                .stream()
                .map(NotificationViews.NotificationPreferenceView::from)
                .collect(Collectors.toList());
    }

    @PutMapping("/preferences/{eventType}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Update the in-app and email preference for a specific event type")
    public NotificationViews.NotificationPreferenceView updatePreference(
            @PathVariable String eventType,
            @Valid @RequestBody NotificationDtos.UpdatePreferenceRequest request) {
        CurrentUser user = CurrentUser.require();
        return NotificationViews.NotificationPreferenceView.from(
                notificationService.updatePreference(
                        user.id(), user.organizationId(), eventType,
                        request.inAppEnabled(), request.emailEnabled()));
    }
}
