package com.pawanputra.bos.integration.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.integration.api.IntegrationType;
import com.pawanputra.bos.integration.internal.IntegrationConfig;
import com.pawanputra.bos.integration.internal.IntegrationService;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for viewing and managing external integration configurations.
 *
 * <p>SECURITY: {@code configJson} is NEVER returned in any response — it contains credentials.
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/integrations")
@Tag(name = "Integration Center")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class IntegrationController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.INTEGRATION_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.INTEGRATION_MANAGE + "')";

    private final IntegrationService service;
    private final com.pawanputra.bos.integration.api.EmailProvider emailProvider;
    private final com.pawanputra.bos.integration.api.WhatsAppProvider whatsAppProvider;
    private final org.springframework.beans.factory.ObjectProvider<com.pawanputra.bos.platform.storage.ObjectStorage> objectStorageProvider;

    public IntegrationController(
            IntegrationService service,
            com.pawanputra.bos.integration.api.EmailProvider emailProvider,
            com.pawanputra.bos.integration.api.WhatsAppProvider whatsAppProvider,
            org.springframework.beans.factory.ObjectProvider<com.pawanputra.bos.platform.storage.ObjectStorage> objectStorageProvider) {
        this.service = service;
        this.emailProvider = emailProvider;
        this.whatsAppProvider = whatsAppProvider;
        this.objectStorageProvider = objectStorageProvider;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all integration configurations for the current organisation")
    public List<IntegrationViews.IntegrationConfigView> listAll() {
        CurrentUser user = CurrentUser.require();
        return service.listAll(user.organizationId())
                .stream()
                .map(IntegrationViews.IntegrationConfigView::from)
                .toList();
    }

    @GetMapping("/{type}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a single integration configuration by type")
    public IntegrationViews.IntegrationConfigView getByType(@PathVariable IntegrationType type) {
        CurrentUser user = CurrentUser.require();
        return IntegrationViews.IntegrationConfigView.from(
                service.getByType(type, user.organizationId()));
    }

    @PutMapping("/{type}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create or update an integration configuration (upsert)")
    public IntegrationViews.IntegrationConfigView upsert(
            @PathVariable IntegrationType type,
            @Valid @RequestBody IntegrationDtos.UpsertRequest request) {
        CurrentUser user = CurrentUser.require();
        IntegrationConfig config = service.upsert(
                type,
                request.providerName(),
                request.configJson(),
                user.organizationId(),
                user.email());
        return IntegrationViews.IntegrationConfigView.from(config);
    }

    @PutMapping("/{type}/enable")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Enable an integration")
    public IntegrationViews.IntegrationConfigView enable(@PathVariable IntegrationType type) {
        CurrentUser user = CurrentUser.require();
        return IntegrationViews.IntegrationConfigView.from(
                service.enable(type, user.organizationId(), user.email()));
    }

    @PutMapping("/{type}/disable")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Disable an integration")
    public IntegrationViews.IntegrationConfigView disable(@PathVariable IntegrationType type) {
        CurrentUser user = CurrentUser.require();
        return IntegrationViews.IntegrationConfigView.from(
                service.disable(type, user.organizationId(), user.email()));
    }

    @PostMapping("/{type}/test")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Test the connection for an integration and record the result")
    public ResponseEntity<IntegrationViews.IntegrationConfigView> testConnection(
            @PathVariable IntegrationType type) {
        CurrentUser user = CurrentUser.require();
        boolean success = false;
        String errorMessage = null;

        try {
            switch (type) {
                case EMAIL -> {
                    success = emailProvider.testConnection();
                    if (!success) {
                        errorMessage = "Failed to connect to email provider (" + emailProvider.getProviderName() + "). Verify API key in configuration.";
                    }
                }
                case WHATSAPP -> {
                    success = whatsAppProvider.testConnection();
                    if (!success) {
                        errorMessage = "Failed to connect to WhatsApp provider (" + whatsAppProvider.getProviderName() + "). Verify credentials in configuration.";
                    }
                }
                case OBJECT_STORAGE -> {
                    var storage = objectStorageProvider.getIfAvailable();
                    if (storage != null) {
                        success = true;
                    } else {
                        errorMessage = "Object storage provider is not configured.";
                    }
                }
                default -> {
                    errorMessage = "Live testing not supported for " + type;
                }
            }
        } catch (Exception ex) {
            success = false;
            errorMessage = ex.getMessage();
        }

        IntegrationConfig config = service.recordTestResult(
                type, user.organizationId(), success,
                errorMessage, user.email());
        return ResponseEntity.ok(IntegrationViews.IntegrationConfigView.from(config));
    }
}
