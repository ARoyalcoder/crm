package com.pawanputra.bos.servicecontract.internal;

import com.pawanputra.bos.servicecontract.api.WarrantyStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WarrantyRepository extends JpaRepository<Warranty, UUID> {

    Optional<Warranty> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Warranty> findByOrganizationIdAndCustomerId(UUID organizationId, UUID customerId);

    Page<Warranty> findByOrganizationId(UUID organizationId, Pageable pageable);

    List<Warranty> findByStatusAndEndDateBefore(WarrantyStatus status, LocalDate date);
}
