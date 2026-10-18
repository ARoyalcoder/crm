package com.pawanputra.bos.support.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlaRepository extends JpaRepository<Sla, UUID> {

    /** Always scope by organization: an SLA of another organization must look like it does not exist. */
    Optional<Sla> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Sla> findAllByOrganizationIdOrderByPriorityAscNameAsc(UUID organizationId);
}
