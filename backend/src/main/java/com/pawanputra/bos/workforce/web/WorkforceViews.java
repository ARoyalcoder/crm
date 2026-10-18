package com.pawanputra.bos.workforce.web;

import com.pawanputra.bos.workforce.api.AttendanceType;
import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.LeaveType;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import com.pawanputra.bos.workforce.internal.AttendanceRecord;
import com.pawanputra.bos.workforce.internal.AttendanceService;
import com.pawanputra.bos.workforce.internal.EmployeeProfile;
import com.pawanputra.bos.workforce.internal.LeaveBalance;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/** Immutable read-model records returned by the workforce controllers. */
public final class WorkforceViews {

    private WorkforceViews() {
    }

    public record EmployeeProfileView(
            UUID id,
            UUID organizationId,
            UUID userId,
            String fullName,
            String email,
            String employeeCode,
            WorkforceDepartment department,
            String designation,
            LocalDate joiningDate,
            UUID managerId,
            String skills,
            EmploymentStatus employmentStatus,
            Instant createdAt,
            String createdBy,
            Instant updatedAt,
            String updatedBy) {

        static EmployeeProfileView from(EmployeeProfile e, Person person) {
            return new EmployeeProfileView(
                    e.getId(),
                    e.getOrganizationId(),
                    e.getUserId(),
                    person == null ? null : person.fullName(),
                    person == null ? null : person.email(),
                    e.getEmployeeCode(),
                    e.getDepartment(),
                    e.getDesignation(),
                    e.getJoiningDate(),
                    e.getManagerId(),
                    e.getSkills(),
                    e.getEmploymentStatus(),
                    e.getCreatedAt(),
                    e.getCreatedBy(),
                    e.getUpdatedAt(),
                    e.getUpdatedBy());
        }
    }

    /** Who an employee profile belongs to: the name and email of the user account it is linked to. */
    public record Person(String fullName, String email) {
    }

    /** A user account that could be given an employee profile. */
    public record UserOption(UUID userId, String fullName, String email) {
    }

    public record AttendanceRecordView(
            UUID id,
            UUID employeeId,
            LocalDate attendanceDate,
            AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            Double workingHours,
            LeaveType leaveType,
            String notes,
            UUID markedBy,
            Instant createdAt,
            Instant updatedAt) {

        static AttendanceRecordView from(AttendanceRecord r) {
            return new AttendanceRecordView(
                    r.getId(),
                    r.getEmployeeId(),
                    r.getAttendanceDate(),
                    r.getType(),
                    r.getCheckIn(),
                    r.getCheckOut(),
                    r.getWorkingHours(),
                    r.getLeaveType(),
                    r.getNotes(),
                    r.getMarkedBy(),
                    r.getCreatedAt(),
                    r.getUpdatedAt());
        }
    }

    public record AttendanceSummaryView(
            int presentDays,
            int absentDays,
            int leaveDays,
            int halfDays,
            int holidayDays,
            int workFromHomeDays,
            double totalWorkingHours) {

        static AttendanceSummaryView from(AttendanceService.AttendanceSummary s) {
            return new AttendanceSummaryView(
                    s.presentDays(),
                    s.absentDays(),
                    s.leaveDays(),
                    s.halfDays(),
                    s.holidayDays(),
                    s.workFromHomeDays(),
                    s.totalWorkingHours());
        }
    }

    public record LeaveBalanceView(
            UUID id,
            UUID employeeId,
            int year,
            LeaveType leaveType,
            int allocated,
            int used,
            int remaining) {

        static LeaveBalanceView from(LeaveBalance lb) {
            return new LeaveBalanceView(
                    lb.getId(),
                    lb.getEmployeeId(),
                    lb.getYear(),
                    lb.getLeaveType(),
                    lb.getAllocated(),
                    lb.getUsed(),
                    lb.getRemaining());
        }
    }
}
