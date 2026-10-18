package com.pawanputra.bos.servicecontract.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import com.pawanputra.bos.platform.web.Paging;
import com.pawanputra.bos.servicecontract.internal.WarrantyService;
import com.pawanputra.bos.servicecontract.internal.WarrantyViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/warranties")
@Tag(name = "Warranties")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class WarrantyController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.WARRANTY_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.WARRANTY_MANAGE + "')";

    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("createdAt"));

    private final WarrantyService warrantyService;

    public WarrantyController(WarrantyService warrantyService) {
        this.warrantyService = warrantyService;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List warranties with pagination")
    public PageResponse<WarrantyViews.Summary> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser user = CurrentUser.require();
        Pageable pageable = Paging.of(page, size, null, java.util.Map.of(), DEFAULT_SORT);
        Page<WarrantyViews.Summary> result = warrantyService.findPage(user.organizationId(), pageable);
        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @GetMapping("/by-customer/{customerId}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List warranties for a specific customer")
    public WarrantyViews.CustomerWarranties listByCustomer(@PathVariable UUID customerId) {
        CurrentUser user = CurrentUser.require();
        return warrantyService.listByCustomer(user.organizationId(), customerId);
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get warranty detail")
    public WarrantyViews.Detail getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return warrantyService.getById(user.organizationId(), id);
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a warranty")
    public ResponseEntity<WarrantyViews.Detail> create(@Valid @RequestBody WarrantyDtos.CreateWarrantyRequest request) {
        CurrentUser user = CurrentUser.require();
        WarrantyViews.Detail created = warrantyService.create(user.organizationId(), request.toCommand(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/warranties/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a warranty")
    public WarrantyViews.Detail update(
            @PathVariable UUID id,
            @Valid @RequestBody WarrantyDtos.UpdateWarrantyRequest request) {
        CurrentUser user = CurrentUser.require();
        return warrantyService.update(user.organizationId(), id, request.toCommand(), user.email());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete a warranty")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        warrantyService.delete(user.organizationId(), id);
        return ResponseEntity.noContent().build();
    }
}
