package com.pawanputra.bos.workforce.internal;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {

    Optional<AttendanceRecord> findByEmployeeIdAndAttendanceDate(UUID employeeId, LocalDate attendanceDate);

    List<AttendanceRecord> findAllByEmployeeIdOrderByAttendanceDateDesc(UUID employeeId);

    /** All records for an employee within any date range (inclusive on both ends). */
    @Query("SELECT a FROM AttendanceRecord a WHERE a.employeeId = :empId " +
           "AND a.attendanceDate >= :from AND a.attendanceDate <= :to " +
           "ORDER BY a.attendanceDate ASC")
    List<AttendanceRecord> findByEmployeeIdAndDateRange(
            @Param("empId") UUID employeeId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    List<AttendanceRecord> findAllByOrganizationIdAndAttendanceDateOrderByEmployeeIdAsc(
            UUID organizationId, LocalDate date);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.employeeId IN :employeeIds " +
           "AND a.attendanceDate = :date ORDER BY a.employeeId ASC")
    List<AttendanceRecord> findByEmployeeIdsAndDate(
            @Param("employeeIds") List<UUID> employeeIds,
            @Param("date") LocalDate date);
}
