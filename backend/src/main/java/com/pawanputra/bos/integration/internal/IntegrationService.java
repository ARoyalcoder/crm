package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.IntegrationStatus;
import com.pawanputra.bos.integration.api.IntegrationType;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Domain service for managing external integration configurations.
 *
 * <p>Note: actually testing connectivity (calling the upstream provider) is the responsibility of
 * the specific provider bean, not this service. This service only manages the configuration and
 * status records.
 */
@Service
@Transactional
public class IntegrationService {

    private static final Logger log = LoggerFactory.getLogger(IntegrationService.class);

    private final IntegrationConfigRepository repository;

    public IntegrationService(IntegrationConfigRepository repository) {
        this.repository = repository;
    }

    // ---- Queries ----

    @Transactional(readOnly = true)
    public List<IntegrationConfig> listAll(UUID organizationId) {
        return repository.findAllByOrganizationIdOrderByTypeAsc(organizationId);
    }

    @Transactional(readOnly = true)
    public IntegrationConfig getByType(IntegrationType type, UUID organizationId) {
        return repository.findByOrganizationIdAndType(organizationId, type)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationConfig", type));
    }

    @Transactional(readOnly = true)
    public IntegrationStatus getStatus(IntegrationType type, UUID organizationId) {
        return getByType(type, organizationId).getStatus();
    }

    // ---- Mutations ----

    /**
     * Creates or updates the integration configuration for the given type. If a row already exists
     * for this {@code (type, organizationId)}, the provider name and config are updated; otherwise
     * a new row is inserted.
     */
    public IntegrationConfig upsert(IntegrationType type, String providerName, String configJson,
            UUID organizationId, String actor) {
        IntegrationConfig config = repository
                .findByOrganizationIdAndType(organizationId, type)
                .orElseGet(() -> {
                    log.info("[INTEGRATION] Creating config for {} in org {}", type, organizationId);
                    return new IntegrationConfig(organizationId, type, providerName, configJson, actor);
                });

        if (config.getId() != null) {
            config.updateConfig(providerName, configJson, actor);
        }

        return repository.save(config);
    }

    public IntegrationConfig enable(IntegrationType type, UUID organizationId, String actor) {
        IntegrationConfig config = getByType(type, organizationId);
        config.enable(actor);
        return repository.save(config);
    }

    public IntegrationConfig disable(IntegrationType type, UUID organizationId, String actor) {
        IntegrationConfig config = getByType(type, organizationId);
        config.disable(actor);
        return repository.save(config);
    }

    /**
     * Records the result of a connection test. The caller is responsible for actually running the
     * test; this method only persists the outcome.
     *
     * @param success      {@code true} if the test passed
     * @param errorMessage error text when the test failed; {@code null} on success
     */
    public IntegrationConfig recordTestResult(IntegrationType type, UUID organizationId,
            boolean success, String errorMessage, String actor) {
        IntegrationConfig config = getByType(type, organizationId);
        config.recordTestResult(success, errorMessage, actor);
        return repository.save(config);
    }
}
