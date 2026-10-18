package com.pawanputra.bos.performance.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.performance.api.CommissionStatus;
import com.pawanputra.bos.performance.internal.CommissionRecordService;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Performance - Commission Records")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class CommissionRecordController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.COMMISSION_VIEW   + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.COMMISSION_MANAGE + "')";

    private final CommissionRecordService service;

    public CommissionRecordController(CommissionRecordService service) {
        this.service = service;
    }

    @GetMapping(ApiPaths.V1 + "/employees/{employeeId}/commissions")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List commission records for an employee (filter by year, month and/or status)")
    public List<PerformanceViews.CommissionRecordView> listByEmployee(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) CommissionStatus status) {
        CurrentUser user = CurrentUser.require();
        return service.listByEmployee(user.organizationId(), employeeId, year, month, status)
                .stream()
                .map(PerformanceViews.CommissionRecordView::from)
                .collect(Collectors.toList());
    }

    @GetMapping(ApiPaths.V1 + "/employees/{employeeId}/commissions/summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Commission summary (pending/approved/paid totals) for an employee and period")
    public PerformanceViews.CommissionSummaryView employeeSummary(
            @PathVariable UUID employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionSummaryView.from(
                service.getSummaryByEmployee(user.organizationId(), employeeId, year, month));
    }

    @GetMapping(ApiPaths.V1 + "/commissions/summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Organisation-wide commission summary for a period (admin/director view)")
    public PerformanceViews.CommissionSummaryView orgSummary(
            @RequestParam int year,
            @RequestParam int month) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionSummaryView.from(
                service.getSummaryForOrg(user.organizationId(), year, month));
    }

    @GetMapping(ApiPaths.V1 + "/commissions")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Paginated list of all commission records for the organisation (admin view)")
    public Page<PerformanceViews.CommissionRecordView> listAll(Pageable pageable) {
        CurrentUser user = CurrentUser.require();
        return service.listAll(user.organizationId(), pageable)
                .map(PerformanceViews.CommissionRecordView::from);
    }

    @PutMapping(ApiPaths.V1 + "/commissions/{id}/approve")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Approve a PENDING commission record")
    public PerformanceViews.CommissionRecordView approve(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionRecordView.from(
                service.approve(user.organizationId(), id, user.id()));
    }

    @PutMapping(ApiPaths.V1 + "/commissions/{id}/paid")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Mark an APPROVED commission record as paid")
    public PerformanceViews.CommissionRecordView markPaid(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionRecordView.from(
                service.markPaid(user.organizationId(), id));
    }

    @PutMapping(ApiPaths.V1 + "/commissions/{id}/cancel")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Cancel a PENDING or APPROVED commission record")
    public PerformanceViews.CommissionRecordView cancel(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return PerformanceViews.CommissionRecordView.from(
                service.cancel(user.organizationId(), id));
    }
}
