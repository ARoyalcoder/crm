package com.pawanputra.bos.events.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.events.internal.BusinessEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/events")
@Tag(name = "Business Events")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class BusinessEventController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.AUDIT_VIEW + "')";
    private static final int DEFAULT_LIMIT = 50;

    private final BusinessEventService eventService;

    public BusinessEventController(BusinessEventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping("/recent")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List the most-recent business events for the current organisation")
    public List<EventViews.BusinessEventView> getRecent(
            @RequestParam(defaultValue = "50") int limit) {
        CurrentUser user = CurrentUser.require();
        int safeLimit = Math.min(Math.max(1, limit), 200);
        return eventService.findRecent(user.organizationId(), safeLimit)
                .stream()
                .map(EventViews.BusinessEventView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all events attached to a specific domain record")
    public List<EventViews.BusinessEventView> getByEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return eventService.findByEntity(entityType, entityId)
                .stream()
                .map(EventViews.BusinessEventView::from)
                .collect(Collectors.toList());
    }
}
