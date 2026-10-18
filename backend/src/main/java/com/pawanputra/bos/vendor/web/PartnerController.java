package com.pawanputra.bos.vendor.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.vendor.internal.Partner;
import com.pawanputra.bos.vendor.internal.PartnerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
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

/**
 * Partner organisations. Partners are always subject to restricted access levels.
 * Organisation context always comes from the access token.
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/partners")
@Tag(name = "Partners")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class PartnerController {

    private static final String CAN_VIEW   = "hasAuthority('" + Permissions.PARTNER_VIEW   + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.PARTNER_MANAGE + "')";

    private final PartnerService partnerService;

    public PartnerController(PartnerService partnerService) {
        this.partnerService = partnerService;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all partner organisations. Requires PARTNER_VIEW.")
    public List<VendorViews.PartnerView> list() {
        UUID orgId = CurrentUser.require().organizationId();
        return partnerService.listAll(orgId).stream()
                .map(VendorViews.PartnerView::from)
                .collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a partner organisation. Partners receive only the access level specified — "
            + "never unrestricted CRM access. Requires PARTNER_MANAGE.")
    public ResponseEntity<VendorViews.PartnerView> create(@Valid @RequestBody VendorDtos.PartnerRequest request) {
        CurrentUser user = CurrentUser.require();
        Partner created = partnerService.create(user.organizationId(), request.toCreateCmd(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/partners/" + created.getId()))
                .body(VendorViews.PartnerView.from(created));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a partner by ID. Requires PARTNER_VIEW.")
    public VendorViews.PartnerView get(@PathVariable UUID id) {
        return VendorViews.PartnerView.from(partnerService.getById(CurrentUser.require().organizationId(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a partner organisation. Requires PARTNER_MANAGE.")
    public VendorViews.PartnerView update(@PathVariable UUID id, @Valid @RequestBody VendorDtos.PartnerRequest request) {
        CurrentUser user = CurrentUser.require();
        return VendorViews.PartnerView.from(
                partnerService.update(user.organizationId(), id, request.toUpdateCmd(), user.email()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete a partner organisation. Requires PARTNER_MANAGE.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        partnerService.delete(CurrentUser.require().organizationId(), id);
        return ResponseEntity.noContent().build();
    }
}
