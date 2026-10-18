package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.AttendanceType;
import com.pawanputra.bos.workforce.api.LeaveType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * A single day's attendance record for one employee.
 * The (employee_id, attendance_date) pair is unique: updating an existing record is an upsert.
 * Working hours are derived from checkOut − checkIn when both are present.
 */
@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private AttendanceType type;

    @Column(name = "check_in")
    private LocalTime checkIn;

    @Column(name = "check_out")
    private LocalTime checkOut;

    /** Decimal hours. Null when check-in or check-out is absent. */
    @Column(name = "working_hours")
    private Double workingHours;

    /** Only set when {@code type == LEAVE}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "leave_type", length = 20)
    private LeaveType leaveType;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    /** The HR/manager user who marked the record on behalf of the employee. */
    @Column(name = "marked_by")
    private UUID markedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AttendanceRecord() {
        // for JPA
    }

    public AttendanceRecord(
            UUID organizationId,
            UUID employeeId,
            LocalDate attendanceDate,
            AttendanceType type,
            LocalTime checkIn,
            LocalTime checkOut,
            LeaveType leaveType,
            String notes,
            UUID markedBy) {
        this.id = UUID.randomUUID();
        this.organizationId = organizationId;
        this.employeeId = employeeId;
        this.attendanceDate = attendanceDate;
        this.type = type;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.workingHours = calculateWorkingHours(checkIn, checkOut);
        this.leaveType = leaveType;
        this.notes = notes;
        this.markedBy = markedBy;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    private static Double calculateWorkingHours(LocalTime checkIn, LocalTime checkOut) {
        if (checkIn == null || checkOut == null) {
            return null;
        }
        long minutes = java.time.Duration.between(checkIn, checkOut).toMinutes();
        return minutes > 0 ? minutes / 60.0 : null;
    }

    public void update(AttendanceType type, LocalTime checkIn, LocalTime checkOut,
                       LeaveType leaveType, String notes, UUID markedBy) {
        this.type = type;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.workingHours = calculateWorkingHours(checkIn, checkOut);
        this.leaveType = leaveType;
        this.notes = notes;
        this.markedBy = markedBy;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getEmployeeId() { return employeeId; }
    public LocalDate getAttendanceDate() { return attendanceDate; }
    public AttendanceType getType() { return type; }
    public LocalTime getCheckIn() { return checkIn; }
    public LocalTime getCheckOut() { return checkOut; }
    public Double getWorkingHours() { return workingHours; }
    public LeaveType getLeaveType() { return leaveType; }
    public String getNotes() { return notes; }
    public UUID getMarkedBy() { return markedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
