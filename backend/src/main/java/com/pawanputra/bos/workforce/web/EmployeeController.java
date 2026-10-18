package com.pawanputra.bos.workforce.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import com.pawanputra.bos.workforce.internal.AttendanceService;
import com.pawanputra.bos.workforce.internal.EmployeeProfile;
import com.pawanputra.bos.workforce.internal.EmployeeProfileService;
import com.pawanputra.bos.workforce.internal.LeaveBalanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/employees")
@Tag(name = "Workforce - Employees")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class EmployeeController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.WORKFORCE_VIEW + "')";
    private static final String CAN_CREATE = "hasAuthority('" + Permissions.WORKFORCE_CREATE + "')";
    private static final String CAN_UPDATE = "hasAuthority('" + Permissions.WORKFORCE_UPDATE + "')";

    private final EmployeeProfileService profileService;
    private final AttendanceService attendanceService;
    private final LeaveBalanceService leaveBalanceService;
    private final EmployeeViewFactory views;

    public EmployeeController(EmployeeProfileService profileService,
                               AttendanceService attendanceService,
                               LeaveBalanceService leaveBalanceService,
                               EmployeeViewFactory views) {
        this.profileService = profileService;
        this.attendanceService = attendanceService;
        this.leaveBalanceService = leaveBalanceService;
        this.views = views;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List employees with optional filters: department, status, managerId")
    public List<WorkforceViews.EmployeeProfileView> list(
            @RequestParam(required = false) WorkforceDepartment department,
            @RequestParam(required = false) EmploymentStatus status,
            @RequestParam(required = false) UUID managerId) {
        CurrentUser user = CurrentUser.require();
        List<EmployeeProfile> result;
        if (managerId != null) {
            result = profileService.listByManager(managerId);
        } else if (department != null && status != null) {
            result = profileService.listByDepartment(user.organizationId(), department)
                    .stream()
                    .filter(e -> e.getEmploymentStatus() == status)
                    .collect(Collectors.toList());
        } else if (department != null) {
            result = profileService.listByDepartment(user.organizationId(), department);
        } else if (status != null) {
            result = profileService.listByStatus(user.organizationId(), status);
        } else {
            result = profileService.listAll(user.organizationId());
        }
        return views.views(result);
    }

    @GetMapping("/available-users")
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Users of the organization who have no employee profile yet, for the add-employee form")
    public List<WorkforceViews.UserOption> availableUsers() {
        return views.usersWithoutProfile(CurrentUser.require().organizationId());
    }

    @PostMapping
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Create an employee profile linked to an existing user")
    public ResponseEntity<WorkforceViews.EmployeeProfileView> create(
            @Valid @RequestBody WorkforceDtos.CreateEmployeeRequest request) {
        CurrentUser user = CurrentUser.require();
        EmployeeProfile created = profileService.createProfile(
                user.organizationId(), request.toCommand(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/employees/" + created.getId()))
                .body(views.view(created));
    }

    @GetMapping("/me")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get the current user's employee profile")
    public WorkforceViews.EmployeeProfileView getMyProfile() {
        CurrentUser user = CurrentUser.require();
        return views.view(profileService.getOrCreateByUserId(user.organizationId(), user.id(), user.email()));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get employee profile by ID")
    public WorkforceViews.EmployeeProfileView getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return views.view(profileService.getById(user.organizationId(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Update an employee profile")
    public WorkforceViews.EmployeeProfileView update(
            @PathVariable UUID id,
            @Valid @RequestBody WorkforceDtos.UpdateEmployeeRequest request) {
        CurrentUser user = CurrentUser.require();
        return views.view(profileService.updateProfile(user.organizationId(), id, request.toCommand(), user.email()));
    }

    @GetMapping("/{id}/team")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get direct reports (team) for a manager employee")
    public List<WorkforceViews.EmployeeProfileView> getTeam(@PathVariable UUID id) {
        return views.views(profileService.getEmployeeTeam(id));
    }

    @GetMapping("/{id}/attendance")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get attendance records for an employee by month and year")
    public List<WorkforceViews.AttendanceRecordView> getAttendance(
            @PathVariable UUID id,
            @RequestParam int year,
            @RequestParam int month) {
        return attendanceService.getAttendanceForMonth(id, year, month)
                .stream()
                .map(WorkforceViews.AttendanceRecordView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}/attendance/summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get attendance summary for an employee between two dates")
    public WorkforceViews.AttendanceSummaryView getAttendanceSummary(
            @PathVariable UUID id,
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate) {
        return WorkforceViews.AttendanceSummaryView.from(
                attendanceService.getAttendanceSummary(id, fromDate, toDate));
    }

    @GetMapping("/me/attendance")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get the current user's own attendance for a month")
    public List<WorkforceViews.AttendanceRecordView> getMyAttendance(
            @RequestParam int year,
            @RequestParam int month) {
        CurrentUser user = CurrentUser.require();
        EmployeeProfile profile = profileService.getOrCreateByUserId(user.organizationId(), user.id(), user.email());
        return attendanceService.getAttendanceForMonth(profile.getId(), year, month)
                .stream()
                .map(WorkforceViews.AttendanceRecordView::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}/leave-balances")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get leave balances for an employee by year")
    public List<WorkforceViews.LeaveBalanceView> getLeaveBalances(
            @PathVariable UUID id,
            @RequestParam int year) {
        return leaveBalanceService.getBalances(id, year)
                .stream()
                .map(WorkforceViews.LeaveBalanceView::from)
                .collect(Collectors.toList());
    }

    @PutMapping("/{id}/leave-balances/{leaveType}")
    @PreAuthorize(CAN_UPDATE)
    @Operation(summary = "Update leave balance for an employee (allocated and used)")
    public WorkforceViews.LeaveBalanceView updateLeaveBalance(
            @PathVariable UUID id,
            @PathVariable com.pawanputra.bos.workforce.api.LeaveType leaveType,
            @Valid @RequestBody WorkforceDtos.UpdateLeaveBalanceRequest request) {
        CurrentUser user = CurrentUser.require();
        // Verify the profile belongs to this organization (throws if not found)
        profileService.getById(user.organizationId(), id);
        int year = LocalDate.now().getYear();
        leaveBalanceService.setAllocated(
                user.organizationId(), id, leaveType, year, request.allocated());
        return WorkforceViews.LeaveBalanceView.from(
                leaveBalanceService.updateLeaveBalance(
                        user.organizationId(), id, leaveType, year, request.used()));
    }
}
