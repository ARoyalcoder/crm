package com.pawanputra.bos.finance.internal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceivablesConfigRepository extends JpaRepository<ReceivablesConfig, UUID> {

    Optional<ReceivablesConfig> findByOrganizationId(UUID organizationId);
}
