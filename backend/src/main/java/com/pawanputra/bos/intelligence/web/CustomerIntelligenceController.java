package com.pawanputra.bos.intelligence.web;

import com.pawanputra.bos.intelligence.api.CustomerSegment;
import com.pawanputra.bos.intelligence.internal.CustomerIntelligenceService;
import com.pawanputra.bos.intelligence.internal.CustomerIntelligenceService.IntelligenceExplanation;
import com.pawanputra.bos.intelligence.internal.CustomerIntelligenceService.OrgIntelligenceSummary;
import com.pawanputra.bos.intelligence.internal.CustomerIntelligenceSnapshot;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Customer Intelligence: health scores, CLV, segments and explanations.
 * All scoring is rule-based and transparent; no opaque ML models.
 */
@RestController
@io.swagger.v3.oas.annotations.tags.Tag(name = "Customer Intelligence")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class CustomerIntelligenceController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.INTELLIGENCE_VIEW + "')";

    private final CustomerIntelligenceService intelligence;

    public CustomerIntelligenceController(CustomerIntelligenceService intelligence) {
        this.intelligence = intelligence;
    }

    // ------------------------------------------------------------------ per-customer

    @GetMapping(ApiPaths.V1 + "/customers/{customerId}/intelligence")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get (or compute) the intelligence snapshot for a customer: health score, "
            + "segment, CLV and score breakdown. Requires INTELLIGENCE_VIEW.")
    public CustomerIntelligenceSnapshot get(@PathVariable UUID customerId) {
        return intelligence.getSnapshot(customerId, organizationId());
    }

    @PostMapping(ApiPaths.V1 + "/customers/{customerId}/intelligence/refresh")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Force-recompute the intelligence snapshot for a customer. "
            + "Requires INTELLIGENCE_VIEW.")
    public CustomerIntelligenceSnapshot refresh(@PathVariable UUID customerId) {
        return intelligence.compute(customerId, organizationId());
    }

    @GetMapping(ApiPaths.V1 + "/customers/{customerId}/intelligence/explanation")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Human-readable explanation: why is this customer in their current segment? "
            + "Returns one sentence per score contributor. Requires INTELLIGENCE_VIEW.")
    public IntelligenceExplanation explanation(@PathVariable UUID customerId) {
        return intelligence.getExplanation(customerId, organizationId());
    }

    // ------------------------------------------------------------------ org-wide

    @GetMapping(ApiPaths.V1 + "/intelligence/summary")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Org-wide segment summary: customer count per segment and average health score. "
            + "Requires INTELLIGENCE_VIEW.")
    public OrgIntelligenceSummary summary() {
        return intelligence.getOrgIntelligenceSummary(organizationId());
    }

    @GetMapping(ApiPaths.V1 + "/intelligence/customers")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "All customers with their intelligence snapshot. Filter by segment. "
            + "Requires INTELLIGENCE_VIEW.")
    public PageResponse<CustomerIntelligenceSnapshot> listCustomers(
            @RequestParam(required = false) CustomerSegment segment,
            @RequestParam(required = false, defaultValue = "0") int page) {
        return PageResponse.from(intelligence.listBySegment(organizationId(), segment, page), s -> s);
    }

    @GetMapping(ApiPaths.V1 + "/intelligence/at-risk")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "At-risk customers only (segment = AT_RISK). Requires INTELLIGENCE_VIEW.")
    public PageResponse<CustomerIntelligenceSnapshot> atRisk(
            @RequestParam(required = false, defaultValue = "0") int page) {
        return PageResponse.from(
                intelligence.listBySegment(organizationId(), CustomerSegment.AT_RISK, page), s -> s);
    }

    @GetMapping(ApiPaths.V1 + "/intelligence/high-value")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "High-value customers only (segment = HIGH_VALUE). Requires INTELLIGENCE_VIEW.")
    public PageResponse<CustomerIntelligenceSnapshot> highValue(
            @RequestParam(required = false, defaultValue = "0") int page) {
        return PageResponse.from(
                intelligence.listBySegment(organizationId(), CustomerSegment.HIGH_VALUE, page), s -> s);
    }

    // ------------------------------------------------------------------ helpers

    private static UUID organizationId() {
        return CurrentUser.require().organizationId();
    }
}
