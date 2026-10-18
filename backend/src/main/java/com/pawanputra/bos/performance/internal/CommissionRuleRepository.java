package com.pawanputra.bos.performance.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommissionRuleRepository extends JpaRepository<CommissionRule, UUID> {

    Optional<CommissionRule> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<CommissionRule> findAllByOrganizationId(UUID organizationId);

    List<CommissionRule> findAllByOrganizationIdAndActive(UUID organizationId, boolean active);

    /**
     * Find active rules that could apply to a given transaction.
     * Returns rules for the specific service first (serviceId match), then catch-all rules (null serviceId).
     * The caller picks the most specific match.
     */
    @Query("SELECT r FROM CommissionRule r WHERE r.organizationId = :orgId AND r.active = true "
            + "AND (r.serviceId = :serviceId OR r.serviceId IS NULL) "
            + "ORDER BY CASE WHEN r.serviceId IS NOT NULL THEN 0 ELSE 1 END, r.id")
    List<CommissionRule> findActiveMatchingRules(
            @Param("orgId") UUID orgId, @Param("serviceId") UUID serviceId);

    /** Catch-all active rules when no specific service id is available. */
    @Query("SELECT r FROM CommissionRule r WHERE r.organizationId = :orgId AND r.active = true "
            + "AND r.serviceId IS NULL ORDER BY r.id")
    List<CommissionRule> findActiveCatchAllRules(@Param("orgId") UUID orgId);
}
