package com.pawanputra.bos.servicecontract.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import com.pawanputra.bos.platform.web.Paging;
import com.pawanputra.bos.servicecontract.api.AmcStatus;
import com.pawanputra.bos.servicecontract.internal.AmcContractService;
import com.pawanputra.bos.servicecontract.internal.AmcViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/amc-contracts")
@Tag(name = "AMC Contracts")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AmcContractController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.AMC_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.AMC_MANAGE + "')";

    private static final Map<String, String> SORTS = Map.of(
            "contractNumber", "contractNumber",
            "startDate", "startDate",
            "endDate", "endDate",
            "contractValue", "contractValue",
            "status", "status",
            "createdAt", "createdAt");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("createdAt"));

    private final AmcContractService amcContractService;

    public AmcContractController(AmcContractService amcContractService) {
        this.amcContractService = amcContractService;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List AMC contracts with filtering and pagination")
    public PageResponse<AmcViews.ContractSummary> list(
            @RequestParam(required = false) AmcStatus status,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) Integer expiringInDays,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        CurrentUser user = CurrentUser.require();
        Pageable pageable = Paging.of(page, size, sort, SORTS, DEFAULT_SORT);
        AmcContractService.ContractFilter filter = new AmcContractService.ContractFilter(status, customerId, expiringInDays);
        Page<AmcViews.ContractSummary> result = amcContractService.findPage(user.organizationId(), filter, pageable);
        return new PageResponse<>(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @GetMapping("/dashboard")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get AMC dashboard KPIs")
    public AmcViews.Dashboard getDashboard() {
        CurrentUser user = CurrentUser.require();
        return amcContractService.getDashboard(user.organizationId());
    }

    @GetMapping("/expiring")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get contracts expiring in the next 60 days")
    public List<AmcViews.ContractSummary> expiring() {
        CurrentUser user = CurrentUser.require();
        return amcContractService.listExpiringSoon(user.organizationId(), 60);
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get AMC contract detail including visits")
    public AmcViews.ContractDetail getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return amcContractService.getById(user.organizationId(), id);
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create an AMC contract")
    public ResponseEntity<AmcViews.ContractDetail> create(
            @Valid @RequestBody AmcContractDtos.CreateContractRequest request) {
        CurrentUser user = CurrentUser.require();
        AmcViews.ContractDetail created = amcContractService.create(
                user.organizationId(), request.toCommand(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/amc-contracts/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update an AMC contract")
    public AmcViews.ContractDetail update(
            @PathVariable UUID id,
            @Valid @RequestBody AmcContractDtos.UpdateContractRequest request) {
        CurrentUser user = CurrentUser.require();
        return amcContractService.update(user.organizationId(), id, request.toCommand(), user.email());
    }

    @PostMapping("/{id}/renew")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Renew an AMC contract creating a new linked contract")
    public ResponseEntity<AmcViews.ContractDetail> renew(
            @PathVariable UUID id,
            @Valid @RequestBody AmcContractDtos.RenewContractRequest request) {
        CurrentUser user = CurrentUser.require();
        AmcViews.ContractDetail renewed = amcContractService.renewContract(
                user.organizationId(), id, request.toCommand(), user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/amc-contracts/" + renewed.id()))
                .body(renewed);
    }

    @GetMapping("/{id}/visits")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List service visits for an AMC contract")
    public List<AmcViews.VisitView> listVisits(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return amcContractService.listVisits(user.organizationId(), id);
    }

    @PostMapping("/{id}/visits")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Schedule a service visit for an AMC contract")
    public ResponseEntity<AmcViews.VisitView> addVisit(
            @PathVariable UUID id,
            @Valid @RequestBody AmcContractDtos.CreateVisitRequest request) {
        CurrentUser user = CurrentUser.require();
        AmcViews.VisitView visit = amcContractService.addVisit(user.organizationId(), id, request.toCommand());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/amc-service-visits/" + visit.id()))
                .body(visit);
    }
}
