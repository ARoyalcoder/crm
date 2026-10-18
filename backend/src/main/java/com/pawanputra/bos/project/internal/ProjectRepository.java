package com.pawanputra.bos.project.internal;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, UUID>, JpaSpecificationExecutor<Project> {

    Optional<Project> findByIdAndOrganizationId(UUID id, UUID organizationId);

    long countByOrganizationId(UUID organizationId);

    boolean existsByOrganizationIdAndProjectNumber(UUID organizationId, String projectNumber);

    long countByOrganizationIdAndStatus(UUID organizationId, String status);

    /*
     * Whether a project is finished or cancelled is decided by the organization's own status configuration (the
     * "completed" and "cancelled" flags on project_statuses); the built-in COMPLETED and CANCELLED codes always count.
     */
    String LIVE = "p.organizationId = :orgId AND p.deletedAt IS NULL";
    String DONE = "(p.status = 'COMPLETED' OR EXISTS (SELECT 1 FROM ProjectStatusConfig s WHERE s.organizationId = p.organizationId "
            + "AND s.code = p.status AND s.isCompleted = true))";
    String CANCELLED = "(p.status = 'CANCELLED' OR EXISTS (SELECT 1 FROM ProjectStatusConfig s WHERE s.organizationId = p.organizationId "
            + "AND s.code = p.status AND s.isCancelled = true))";

    /** Projects that have not been deleted. */
    @Query("SELECT COUNT(p) FROM Project p WHERE " + LIVE)
    long countLive(@Param("orgId") UUID organizationId);

    /** Projects that are still being delivered: neither finished nor cancelled. */
    @Query("SELECT COUNT(p) FROM Project p WHERE " + LIVE + " AND NOT " + DONE + " AND NOT " + CANCELLED)
    long countOpen(@Param("orgId") UUID organizationId);

    @Query("SELECT COUNT(p) FROM Project p WHERE " + LIVE + " AND " + DONE)
    long countDone(@Param("orgId") UUID organizationId);

    /** Open projects whose expected completion date is before the given day. */
    @Query("SELECT COUNT(p) FROM Project p WHERE " + LIVE + " AND NOT " + DONE + " AND NOT " + CANCELLED
            + " AND p.expectedCompletionDate < :today")
    long countOverdue(@Param("orgId") UUID organizationId, @Param("today") java.time.LocalDate today);

    /** Budget of every project that was not cancelled. */
    @Query("SELECT COALESCE(SUM(p.budget), 0) FROM Project p WHERE " + LIVE + " AND NOT " + CANCELLED)
    BigDecimal sumBudgetByOrganizationId(@Param("orgId") UUID organizationId);

    /** Revenue recorded on every project that was not cancelled. */
    @Query("SELECT COALESCE(SUM(p.revenue), 0) FROM Project p WHERE " + LIVE + " AND NOT " + CANCELLED)
    BigDecimal sumRevenueByOrganizationId(@Param("orgId") UUID organizationId);

    List<Project> findByOrganizationIdAndCustomerId(UUID organizationId, UUID customerId);

    Optional<Project> findByOrganizationIdAndOrderId(UUID organizationId, UUID orderId);
}
