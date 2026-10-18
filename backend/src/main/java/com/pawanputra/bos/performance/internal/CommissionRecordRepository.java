package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.CommissionStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommissionRecordRepository extends JpaRepository<CommissionRecord, UUID> {

    Optional<CommissionRecord> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<CommissionRecord> findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriodMonth(
            UUID organizationId, UUID employeeId, int periodYear, int periodMonth);

    List<CommissionRecord> findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriodMonthAndStatus(
            UUID organizationId, UUID employeeId, int periodYear, int periodMonth, CommissionStatus status);

    List<CommissionRecord> findAllByOrganizationIdAndEmployeeId(UUID organizationId, UUID employeeId);

    /** All records for admin summary across all employees in an org. */
    Page<CommissionRecord> findAllByOrganizationId(UUID organizationId, Pageable pageable);

    /** Total commissions by status for an employee/period for the summary tile. */
    @Query("SELECT cr.status, SUM(cr.commissionAmount) FROM CommissionRecord cr "
            + "WHERE cr.organizationId = :orgId AND cr.employeeId = :employeeId "
            + "AND cr.periodYear = :year AND cr.periodMonth = :month "
            + "GROUP BY cr.status")
    List<Object[]> sumByStatusForEmployee(
            @Param("orgId") UUID orgId,
            @Param("employeeId") UUID employeeId,
            @Param("year") int year,
            @Param("month") int month);

    /** Grand total summary for admin: one row per status across the whole org. */
    @Query("SELECT cr.status, SUM(cr.commissionAmount) FROM CommissionRecord cr "
            + "WHERE cr.organizationId = :orgId AND cr.periodYear = :year AND cr.periodMonth = :month "
            + "GROUP BY cr.status")
    List<Object[]> sumByStatusForOrg(
            @Param("orgId") UUID orgId,
            @Param("year") int year,
            @Param("month") int month);

    /** Prevent duplicate commission records for the same source event. */
    boolean existsByOrganizationIdAndEmployeeIdAndSourceTypeAndSourceId(
            UUID organizationId, UUID employeeId, String sourceType, UUID sourceId);
}
