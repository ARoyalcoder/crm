package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.AmcStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AmcContractRepository extends JpaRepository<AmcContract, UUID>, JpaSpecificationExecutor<AmcContract> {

    Optional<AmcContract> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<AmcContract> findByOrganizationIdAndCustomerId(UUID organizationId, UUID customerId);

    Page<AmcContract> findByOrganizationIdAndStatus(UUID organizationId, AmcStatus status, Pageable pageable);

    boolean existsByOrganizationIdAndContractNumber(UUID organizationId, String contractNumber);

    @Query("SELECT COUNT(c) FROM AmcContract c WHERE c.organizationId = :orgId AND c.status = :status")
    long countByOrganizationIdAndStatus(@Param("orgId") UUID organizationId, @Param("status") AmcStatus status);

    @Query("SELECT c FROM AmcContract c WHERE c.organizationId = :orgId AND c.status = 'ACTIVE' AND c.endDate BETWEEN :from AND :to")
    List<AmcContract> findExpiringSoon(
            @Param("orgId") UUID organizationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("SELECT c FROM AmcContract c WHERE c.status IN ('ACTIVE', 'RENEWAL_PENDING')")
    List<AmcContract> findAllActiveForRenewalCheck();
}
