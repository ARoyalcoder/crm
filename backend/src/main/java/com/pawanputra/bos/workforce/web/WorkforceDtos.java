package com.pawanputra.bos.workforce.web;

import com.pawanputra.bos.workforce.api.AttendanceType;
import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.LeaveType;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import com.pawanputra.bos.workforce.internal.AttendanceService;
import com.pawanputra.bos.workforce.internal.EmployeeProfileService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

final class WorkforceDtos {

    private WorkforceDtos() {
    }

    record CreateEmployeeRequest(
            @NotNull UUID userId,
            @NotNull WorkforceDepartment department,
            @NotBlank @Size(max = 150) String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus) {

        EmployeeProfileService.CreateProfileCmd toCommand() {
            return new EmployeeProfileService.CreateProfileCmd(
                    userId, department, designation, joiningDate, managerId, skills, employmentStatus);
        }
    }

    record UpdateEmployeeRequest(
            @NotNull WorkforceDepartment department,
            @NotBlank @Size(max = 150) String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus) {

        EmployeeProfileService.UpdateProfileCmd toCommand() {
            return new EmployeeProfileService.UpdateProfileCmd(
                    department, designation, joiningDate, managerId, skills, employmentStatus);
        }
    }

    record MarkAttendanceRequest(
            @NotNull LocalDate date,
            @NotNull AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            LeaveType leaveType,
            String notes) {

        AttendanceService.MarkAttendanceCmd toCommand(UUID markedBy) {
            return new AttendanceService.MarkAttendanceCmd(
                    date, type, checkIn, checkOut, leaveType, notes, markedBy);
        }
    }

    record BulkAttendanceEntryRequest(
            @NotNull UUID employeeId,
            @NotNull AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            LeaveType leaveType,
            String notes) {

        AttendanceService.BulkAttendanceEntry toEntry() {
            return new AttendanceService.BulkAttendanceEntry(
                    employeeId, type, checkIn, checkOut, leaveType, notes);
        }
    }

    record BulkMarkAttendanceRequest(
            @NotNull LocalDate date,
            @NotNull List<BulkAttendanceEntryRequest> records) {
    }

    record UpdateLeaveBalanceRequest(
            int allocated,
            int used) {
    }
}
