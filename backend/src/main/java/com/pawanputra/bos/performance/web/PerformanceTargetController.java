package com.pawanputra.bos.performance.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.internal.PerformanceTargetService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Performance - Targets")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class PerformanceTargetController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.PERFORMANCE_VIEW   + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.PERFORMANCE_MANAGE + "')";

    private final PerformanceTargetService service;

    public PerformanceTargetController(PerformanceTargetService service) {
        this.service = service;
    }

    @GetMapping(ApiPaths.V1 + "/employees/{employeeId}/targets")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List performance targets for an employee (filter by year and optionally period)")
    public List<PerformanceViews.PerformanceTargetView> getTargets(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam(required = false) TargetPeriod period) {
        CurrentUser user = CurrentUser.require();
        return service.getTargets(user.organizationId(), employeeId, year, period)
                .stream()
                .map(PerformanceViews.PerformanceTargetView::from)
                .collect(Collectors.toList());
    }

    @PutMapping(ApiPaths.V1 + "/employees/{employeeId}/targets")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Upsert a performance target for an employee (creates or updates for the given period)")
    public PerformanceViews.PerformanceTargetView setTarget(
            @PathVariable UUID employeeId,
            @Valid @RequestBody PerformanceDtos.SetTargetRequest request) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.PerformanceTargetView.from(
                service.setTarget(user.organizationId(), employeeId, request.toCommand()));
    }

    @GetMapping(ApiPaths.V1 + "/employees/{employeeId}/performance-summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get performance summary (target vs. actual) for an employee for a given month")
    public List<PerformanceViews.PerformanceSummaryView> getPerformanceSummary(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        CurrentUser user = CurrentUser.require();
        return service.getPerformanceSummary(user.organizationId(), employeeId, year, month)
                .stream()
                .map(PerformanceViews.PerformanceSummaryView::from)
                .collect(Collectors.toList());
    }

    @GetMapping(ApiPaths.V1 + "/performance/team")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Team performance overview for a manager: avg achievement % for each direct report")
    public List<PerformanceViews.TeamPerformanceView> getTeamPerformance(
            @RequestParam UUID managerId,
            @RequestParam int year,
            @RequestParam int month) {
        CurrentUser user = CurrentUser.require();
        return service.getTeamPerformance(user.organizationId(), managerId, year, month)
                .stream()
                .map(PerformanceViews.TeamPerformanceView::from)
                .collect(Collectors.toList());
    }
}
