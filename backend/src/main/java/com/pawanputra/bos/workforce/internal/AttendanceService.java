package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.AttendanceType;
import com.pawanputra.bos.workforce.api.LeaveType;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AttendanceService {

    private final AttendanceRecordRepository attendanceRecords;
    private final EmployeeProfileRepository employees;

    public AttendanceService(AttendanceRecordRepository attendanceRecords,
                             EmployeeProfileRepository employees) {
        this.attendanceRecords = attendanceRecords;
        this.employees = employees;
    }

    // --- Command records ---

    public record MarkAttendanceCmd(
            LocalDate date,
            AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            LeaveType leaveType,
            String notes,
            UUID markedBy) {
    }

    public record BulkAttendanceEntry(
            UUID employeeId,
            AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            LeaveType leaveType,
            String notes) {
    }

    public record AttendanceSummary(
            int presentDays,
            int absentDays,
            int leaveDays,
            int halfDays,
            int holidayDays,
            int workFromHomeDays,
            double totalWorkingHours) {
    }

    // --- Mutations ---

    public AttendanceRecord markAttendance(UUID organizationId, UUID employeeId, MarkAttendanceCmd cmd) {
        return attendanceRecords.findByEmployeeIdAndAttendanceDate(employeeId, cmd.date())
                .map(existing -> {
                    existing.update(cmd.type(), cmd.checkIn(), cmd.checkOut(),
                            cmd.leaveType(), cmd.notes(), cmd.markedBy());
                    return attendanceRecords.save(existing);
                })
                .orElseGet(() -> {
                    AttendanceRecord record = new AttendanceRecord(
                            organizationId, employeeId, cmd.date(), cmd.type(),
                            cmd.checkIn(), cmd.checkOut(), cmd.leaveType(), cmd.notes(), cmd.markedBy());
                    return attendanceRecords.save(record);
                });
    }

    public List<AttendanceRecord> bulkMarkAttendance(UUID organizationId,
                                                      LocalDate date,
                                                      List<BulkAttendanceEntry> entries,
                                                      UUID markedBy) {
        return entries.stream()
                .map(e -> markAttendance(organizationId, e.employeeId(),
                        new MarkAttendanceCmd(date, e.type(), e.checkIn(), e.checkOut(),
                                e.leaveType(), e.notes(), markedBy)))
                .collect(Collectors.toList());
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getAttendanceForMonth(UUID employeeId, int year, int month) {
        LocalDate first = LocalDate.of(year, month, 1);
        LocalDate last = first.withDayOfMonth(first.lengthOfMonth());
        return attendanceRecords.findByEmployeeIdAndDateRange(employeeId, first, last);
    }

    @Transactional(readOnly = true)
    public AttendanceSummary getAttendanceSummary(UUID employeeId, LocalDate fromDate, LocalDate toDate) {
        List<AttendanceRecord> records = attendanceRecords.findByEmployeeIdAndDateRange(
                employeeId, fromDate, toDate);
        int present = 0, absent = 0, leave = 0, halfDay = 0, holiday = 0, wfh = 0;
        double totalHours = 0.0;
        for (AttendanceRecord r : records) {
            switch (r.getType()) {
                case PRESENT -> present++;
                case ABSENT -> absent++;
                case LEAVE -> leave++;
                case HALF_DAY -> halfDay++;
                case HOLIDAY -> holiday++;
                case WORK_FROM_HOME -> wfh++;
            }
            if (r.getWorkingHours() != null) {
                totalHours += r.getWorkingHours();
            }
        }
        return new AttendanceSummary(present, absent, leave, halfDay, holiday, wfh, totalHours);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getTodayAttendance(UUID organizationId, LocalDate date) {
        return attendanceRecords.findAllByOrganizationIdAndAttendanceDateOrderByEmployeeIdAsc(
                organizationId, date);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> getTeamAttendance(UUID managerId, LocalDate date) {
        List<UUID> teamIds = employees.findAllByManagerIdOrderByEmployeeCodeAsc(managerId)
                .stream().map(EmployeeProfile::getId).collect(Collectors.toList());
        if (teamIds.isEmpty()) {
            return List.of();
        }
        return attendanceRecords.findByEmployeeIdsAndDate(teamIds, date);
    }

    /** Returns a map of employeeId → attendance record for the given date. */
    @Transactional(readOnly = true)
    public Map<UUID, AttendanceRecord> getTeamAttendanceMap(UUID managerId, LocalDate date) {
        return getTeamAttendance(managerId, date).stream()
                .collect(Collectors.toMap(AttendanceRecord::getEmployeeId, r -> r));
    }
}
