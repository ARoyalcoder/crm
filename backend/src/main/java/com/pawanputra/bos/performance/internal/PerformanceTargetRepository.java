package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.api.TargetType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PerformanceTargetRepository extends JpaRepository<PerformanceTarget, UUID> {

    List<PerformanceTarget> findAllByOrganizationIdAndEmployeeId(UUID organizationId, UUID employeeId);

    List<PerformanceTarget> findAllByOrganizationIdAndEmployeeIdAndPeriodYear(
            UUID organizationId, UUID employeeId, int periodYear);

    List<PerformanceTarget> findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriod(
            UUID organizationId, UUID employeeId, int periodYear, TargetPeriod period);

    Optional<PerformanceTarget> findByOrganizationIdAndEmployeeIdAndTargetTypeAndPeriodAndPeriodYearAndPeriodMonthAndPeriodQuarter(
            UUID organizationId, UUID employeeId, TargetType targetType,
            TargetPeriod period, int periodYear, Integer periodMonth, Integer periodQuarter);

    /** All targets across all employees in an org for a given year (for team-level reports). */
    @Query("SELECT pt FROM PerformanceTarget pt WHERE pt.organizationId = :orgId AND pt.periodYear = :year "
            + "AND pt.employeeId IN :employeeIds")
    List<PerformanceTarget> findAllByOrgAndYearForEmployees(
            @Param("orgId") UUID orgId,
            @Param("year") int year,
            @Param("employeeIds") List<UUID> employeeIds);
}
