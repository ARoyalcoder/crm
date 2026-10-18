package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.VisitStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AmcServiceVisitRepository extends JpaRepository<AmcServiceVisit, UUID> {

    List<AmcServiceVisit> findByContractIdOrderByScheduledDateAsc(UUID contractId);

    List<AmcServiceVisit> findByContractIdAndStatus(UUID contractId, VisitStatus status);

    @Query("SELECT v FROM AmcServiceVisit v WHERE v.contractId IN " +
           "(SELECT c.id FROM AmcContract c WHERE c.organizationId = :orgId AND c.status = 'ACTIVE') " +
           "AND v.status = 'SCHEDULED' AND v.scheduledDate BETWEEN :from AND :to " +
           "ORDER BY v.scheduledDate ASC")
    List<AmcServiceVisit> findUpcomingVisits(
            @Param("orgId") UUID organizationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
