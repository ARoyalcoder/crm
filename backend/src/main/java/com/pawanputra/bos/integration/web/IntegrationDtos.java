package com.pawanputra.bos.integration.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request bodies for the integration API. */
final class IntegrationDtos {

    private IntegrationDtos() {
    }

    /**
     * Request to create or update an integration configuration.
     *
     * <p>{@code configJson} is an opaque encrypted blob supplied by the caller; it is stored
     * as-is and never returned in responses.
     */
    record UpsertRequest(
            @NotBlank @Size(max = 100) String providerName,
            String configJson) {
    }
}
