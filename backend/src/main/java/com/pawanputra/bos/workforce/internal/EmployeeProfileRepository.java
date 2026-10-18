package com.pawanputra.bos.workforce.internal;

import com.pawanputra.bos.workforce.api.EmploymentStatus;
import com.pawanputra.bos.workforce.api.WorkforceDepartment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeProfileRepository extends JpaRepository<EmployeeProfile, UUID> {

    Optional<EmployeeProfile> findByUserId(UUID userId);

    Optional<EmployeeProfile> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Optional<EmployeeProfile> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    boolean existsByUserId(UUID userId);

    List<EmployeeProfile> findAllByOrganizationIdOrderByEmployeeCodeAsc(UUID organizationId);

    List<EmployeeProfile> findAllByOrganizationIdAndDepartmentOrderByEmployeeCodeAsc(
            UUID organizationId, WorkforceDepartment department);

    List<EmployeeProfile> findAllByOrganizationIdAndEmploymentStatusOrderByEmployeeCodeAsc(
            UUID organizationId, EmploymentStatus employmentStatus);

    List<EmployeeProfile> findAllByOrganizationIdAndDepartmentAndEmploymentStatusOrderByEmployeeCodeAsc(
            UUID organizationId, WorkforceDepartment department, EmploymentStatus employmentStatus);

    List<EmployeeProfile> findAllByManagerIdOrderByEmployeeCodeAsc(UUID managerId);

    @Query("SELECT COUNT(e) FROM EmployeeProfile e WHERE e.organizationId = :orgId")
    long countByOrganizationId(@Param("orgId") UUID orgId);

    /** Latest employee code number for auto-increment generation. */
    @Query("SELECT e.employeeCode FROM EmployeeProfile e WHERE e.organizationId = :orgId ORDER BY e.employeeCode DESC")
    List<String> findAllEmployeeCodesByOrgId(@Param("orgId") UUID orgId);
}
