package com.pawanputra.bos.performance.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.performance.internal.CommissionRuleService;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
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
@RequestMapping(ApiPaths.V1 + "/commission-rules")
@Tag(name = "Performance - Commission Rules")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class CommissionRuleController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.COMMISSION_VIEW   + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.COMMISSION_MANAGE + "')";

    private final CommissionRuleService service;

    public CommissionRuleController(CommissionRuleService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List commission rules (optionally filter by active status)")
    public List<PerformanceViews.CommissionRuleView> list(
            @RequestParam(required = false) Boolean active) {
        CurrentUser user = CurrentUser.require();
        return service.listAll(user.organizationId(), active)
                .stream()
                .map(PerformanceViews.CommissionRuleView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a commission rule by id")
    public PerformanceViews.CommissionRuleView getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionRuleView.from(service.get(user.organizationId(), id));
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a new commission rule")
    public ResponseEntity<PerformanceViews.CommissionRuleView> create(
            @Valid @RequestBody PerformanceDtos.SaveCommissionRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        var rule = service.create(user.organizationId(), request.toCommand());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/commission-rules/" + rule.getId()))
                .body(PerformanceViews.CommissionRuleView.from(rule));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a commission rule")
    public PerformanceViews.CommissionRuleView update(
            @PathVariable UUID id,
            @Valid @RequestBody PerformanceDtos.SaveCommissionRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionRuleView.from(
                service.update(user.organizationId(), id, request.toCommand()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete a commission rule")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        service.delete(user.organizationId(), id);
        return ResponseEntity.noContent().build();
    }
}
