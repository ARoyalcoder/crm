package com.pawanputra.bos.rewards.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.rewards.internal.AchievementRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/achievement-rules")
@Tag(name = "Rewards - Achievement Rules")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AchievementRuleController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.REWARDS_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.REWARDS_MANAGE + "')";

    private final AchievementRuleService service;

    public AchievementRuleController(AchievementRuleService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List achievement rules, optionally filtered by active status")
    public List<RewardViews.AchievementRuleView> list(
            @RequestParam(required = false) Boolean active) {
        CurrentUser user = CurrentUser.require();
        return service.listAll(user.organizationId(), active)
                .stream()
                .map(RewardViews.AchievementRuleView::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a new achievement rule")
    public ResponseEntity<RewardViews.AchievementRuleView> create(
            @Valid @RequestBody RewardDtos.SaveAchievementRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        var created = service.create(user.organizationId(),
                new AchievementRuleService.SaveRuleCmd(
                        request.name(), request.description(), request.category(),
                        request.triggerEventType(), request.triggerThreshold(),
                        request.employeePoints(), request.badgeLevel()));
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/achievement-rules/" + created.getId()))
                .body(RewardViews.AchievementRuleView.from(created));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a single achievement rule by ID")
    public RewardViews.AchievementRuleView getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return RewardViews.AchievementRuleView.from(service.get(user.organizationId(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update an achievement rule")
    public RewardViews.AchievementRuleView update(
            @PathVariable UUID id,
            @Valid @RequestBody RewardDtos.SaveAchievementRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        return RewardViews.AchievementRuleView.from(
                service.update(user.organizationId(), id,
                        new AchievementRuleService.SaveRuleCmd(
                                request.name(), request.description(), request.category(),
                                request.triggerEventType(), request.triggerThreshold(),
                                request.employeePoints(), request.badgeLevel())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete an achievement rule")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        service.delete(user.organizationId(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/toggle")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Toggle the active/inactive state of an achievement rule")
    public RewardViews.AchievementRuleView toggle(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return RewardViews.AchievementRuleView.from(service.toggle(user.organizationId(), id));
    }
}
