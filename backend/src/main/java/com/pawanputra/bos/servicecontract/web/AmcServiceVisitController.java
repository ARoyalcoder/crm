package com.pawanputra.bos.servicecontract.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.servicecontract.internal.AmcContractService;
import com.pawanputra.bos.servicecontract.internal.AmcViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/amc-service-visits")
@Tag(name = "AMC Service Visits")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AmcServiceVisitController {

    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.AMC_MANAGE + "')";

    private final AmcContractService amcContractService;

    public AmcServiceVisitController(AmcContractService amcContractService) {
        this.amcContractService = amcContractService;
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Complete or cancel a service visit")
    public AmcViews.VisitView updateVisit(
            @PathVariable UUID id,
            @Valid @RequestBody AmcContractDtos.CompleteVisitRequest request) {
        return amcContractService.updateVisit(CurrentUser.require().organizationId(), id, request.toCommand());
    }
}
