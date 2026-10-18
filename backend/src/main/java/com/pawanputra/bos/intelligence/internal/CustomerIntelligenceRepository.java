package com.pawanputra.bos.intelligence.internal;

import com.pawanputra.bos.intelligence.api.CustomerSegment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CustomerIntelligenceRepository extends JpaRepository<CustomerIntelligenceSnapshot, UUID> {

    Optional<CustomerIntelligenceSnapshot> findByCustomerIdAndOrganizationId(UUID customerId, UUID organizationId);

    Page<CustomerIntelligenceSnapshot> findAllByOrganizationId(UUID organizationId, Pageable pageable);

    Page<CustomerIntelligenceSnapshot> findBySegmentAndOrganizationId(
            CustomerSegment segment, UUID organizationId, Pageable pageable);

    List<CustomerIntelligenceSnapshot> findByOrganizationId(UUID organizationId);

    @Query("SELECT s.segment, COUNT(s) FROM CustomerIntelligenceSnapshot s WHERE s.organizationId = :orgId GROUP BY s.segment")
    List<Object[]> countBySegmentForOrg(UUID orgId);

    @Query("SELECT AVG(s.healthScore) FROM CustomerIntelligenceSnapshot s WHERE s.organizationId = :orgId")
    Double avgHealthScoreForOrg(UUID orgId);
}
