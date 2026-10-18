package com.pawanputra.bos.support.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.support.api.TicketPriority;
import com.pawanputra.bos.support.internal.Sla;
import com.pawanputra.bos.support.internal.SlaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** SLA definition management. Only admins can write; any ticket-holder can read. */
@RestController
@RequestMapping(ApiPaths.V1 + "/sla")
@Tag(name = "Support – SLA")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class SlaController {

    private static final String CAN_VIEW = "hasAnyAuthority('" + Permissions.TICKET_VIEW + "', '"
            + Permissions.TICKET_MANAGE + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.TICKET_MANAGE + "')";

    record SlaRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Min(1) @Max(8760) Integer responseTimeHours,
            @NotNull @Min(1) @Max(8760) Integer resolutionTimeHours,
            @NotNull TicketPriority priority,
            boolean active) {

        SlaService.SlaCommand toCommand() {
            return new SlaService.SlaCommand(name.trim(), responseTimeHours, resolutionTimeHours,
                    priority, active);
        }
    }

    record SlaResponse(UUID id, String name, int responseTimeHours, int resolutionTimeHours,
            TicketPriority priority, boolean active, Instant createdAt, Instant updatedAt) {
        static SlaResponse from(Sla sla) {
            return new SlaResponse(sla.getId(), sla.getName(), sla.getResponseTimeHours(),
                    sla.getResolutionTimeHours(), sla.getPriority(), sla.isActive(),
                    sla.getCreatedAt(), sla.getUpdatedAt());
        }
    }

    private final SlaService service;

    public SlaController(SlaService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all SLA definitions for the organisation. Requires TICKET_VIEW or TICKET_MANAGE.")
    public List<SlaResponse> list() {
        return service.list(orgId()).stream().map(SlaResponse::from).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "One SLA definition. Requires TICKET_VIEW or TICKET_MANAGE.")
    public SlaResponse get(@PathVariable UUID id) {
        return SlaResponse.from(service.get(id, orgId()));
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create an SLA definition. Requires TICKET_MANAGE.")
    public ResponseEntity<SlaResponse> create(@Valid @RequestBody SlaRequest request) {
        Sla created = service.create(orgId(), request.toCommand());
        return ResponseEntity.created(URI.create(ApiPaths.V1 + "/sla/" + created.getId()))
                .body(SlaResponse.from(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update an SLA definition. Requires TICKET_MANAGE.")
    public SlaResponse update(@PathVariable UUID id, @Valid @RequestBody SlaRequest request) {
        return SlaResponse.from(service.update(id, orgId(), request.toCommand()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete an SLA definition. Requires TICKET_MANAGE.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id, orgId());
        return ResponseEntity.noContent().build();
    }

    private static UUID orgId() {
        return CurrentUser.require().organizationId();
    }
}
