package com.pawanputra.bos.integration.web;

import com.pawanputra.bos.integration.api.IntegrationStatus;
import com.pawanputra.bos.integration.api.IntegrationType;
import com.pawanputra.bos.integration.internal.IntegrationConfig;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable read-model records returned by the integration controller.
 *
 * <p>IMPORTANT: {@code configJson} is intentionally absent — it contains credentials and must
 * never be serialised to the API response.
 */
public final class IntegrationViews {

    private IntegrationViews() {
    }

    public record IntegrationConfigView(
            UUID id,
            UUID organizationId,
            IntegrationType type,
            String providerName,
            IntegrationStatus status,
            boolean enabled,
            Instant lastTestedAt,
            String lastError,
            String createdBy,
            String updatedBy,
            Instant createdAt,
            Instant updatedAt) {

        public static IntegrationConfigView from(IntegrationConfig c) {
            return new IntegrationConfigView(
                    c.getId(),
                    c.getOrganizationId(),
                    c.getType(),
                    c.getProviderName(),
                    c.getStatus(),
                    c.isEnabled(),
                    c.getLastTestedAt(),
                    c.getLastError(),
                    c.getCreatedBy(),
                    c.getUpdatedBy(),
                    c.getCreatedAt(),
                    c.getUpdatedAt());
        }
    }
}
