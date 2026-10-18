package com.pawanputra.bos.vendor.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<Partner, UUID> {

    Optional<Partner> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Partner> findAllByOrganizationIdOrderByOrganizationNameAsc(UUID organizationId);

    List<Partner> findAllByOrganizationIdAndActiveOrderByOrganizationNameAsc(UUID organizationId, boolean active);
}
