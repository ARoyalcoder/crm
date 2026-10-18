package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.IntegrationStatus;
import com.pawanputra.bos.integration.api.IntegrationType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface IntegrationConfigRepository extends JpaRepository<IntegrationConfig, UUID> {

    List<IntegrationConfig> findAllByOrganizationIdOrderByTypeAsc(UUID organizationId);

    Optional<IntegrationConfig> findByOrganizationIdAndType(UUID organizationId,
            IntegrationType type);

    List<IntegrationConfig> findAllByOrganizationIdAndStatusOrderByTypeAsc(UUID organizationId,
            IntegrationStatus status);
}
