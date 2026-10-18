package com.pawanputra.bos.workforce.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.workforce.internal.AttendanceRecord;
import com.pawanputra.bos.workforce.internal.AttendanceService;
import com.pawanputra.bos.workforce.internal.EmployeeProfile;
import com.pawanputra.bos.workforce.internal.EmployeeProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/attendance")
@Tag(name = "Workforce - Attendance")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AttendanceController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.WORKFORCE_VIEW + "')";
    private static final String CAN_CREATE = "hasAuthority('" + Permissions.WORKFORCE_CREATE + "')";

    private final AttendanceService attendanceService;
    private final EmployeeProfileService profileService;

    public AttendanceController(AttendanceService attendanceService,
                                 EmployeeProfileService profileService) {
        this.attendanceService = attendanceService;
        this.profileService = profileService;
    }

    @PostMapping
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Mark attendance for a single employee")
    public WorkforceViews.AttendanceRecordView markAttendance(
            @RequestParam UUID employeeId,
            @Valid @RequestBody WorkforceDtos.MarkAttendanceRequest request) {
        CurrentUser user = CurrentUser.require();
        // Verify employee belongs to this org
        EmployeeProfile profile = profileService.getById(user.organizationId(), employeeId);
        return WorkforceViews.AttendanceRecordView.from(
                attendanceService.markAttendance(
                        user.organizationId(), profile.getId(), request.toCommand(user.id())));
    }

    @PostMapping("/bulk")
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Bulk mark attendance for multiple employees on the same date")
    public List<WorkforceViews.AttendanceRecordView> bulkMarkAttendance(
            @Valid @RequestBody WorkforceDtos.BulkMarkAttendanceRequest request) {
        CurrentUser user = CurrentUser.require();
        List<AttendanceService.BulkAttendanceEntry> entries = request.records().stream()
                .map(WorkforceDtos.BulkAttendanceEntryRequest::toEntry)
                .collect(Collectors.toList());
        return attendanceService.bulkMarkAttendance(
                        user.organizationId(), request.date(), entries, user.id())
                .stream()
                .map(WorkforceViews.AttendanceRecordView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/today")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get attendance for all employees on a given date (defaults to today)")
    public List<WorkforceViews.AttendanceRecordView> getTodayAttendance(
            @RequestParam(required = false) LocalDate date) {
        CurrentUser user = CurrentUser.require();
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return attendanceService.getTodayAttendance(user.organizationId(), targetDate)
                .stream()
                .map(WorkforceViews.AttendanceRecordView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/team")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get attendance for the current manager's team on a given date")
    public List<WorkforceViews.AttendanceRecordView> getTeamAttendance(
            @RequestParam(required = false) UUID managerId,
            @RequestParam(required = false) LocalDate date) {
        CurrentUser user = CurrentUser.require();
        UUID resolvedManagerId = managerId;
        if (resolvedManagerId == null) {
            // default to the current user's employee profile
            EmployeeProfile profile = profileService.getByUserId(user.organizationId(), user.id());
            resolvedManagerId = profile.getId();
        }
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return attendanceService.getTeamAttendance(resolvedManagerId, targetDate)
                .stream()
                .map(WorkforceViews.AttendanceRecordView::from)
                .collect(Collectors.toList());
    }
}
