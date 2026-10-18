package com.pawanputra.bos.pulse.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import com.pawanputra.bos.platform.web.Paging;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import com.pawanputra.bos.pulse.internal.PulseEngineOrchestrator;
import com.pawanputra.bos.pulse.internal.PulseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * PAWAN PULSE: the insight feed. Surfaces achievements, opportunities, risks and next best actions derived from
 * structured CRM records. Holding PULSE_VIEW opens the feed; what appears in it is limited to insights about
 * records the caller may see (an overdue-invoice insight needs finance access, a cold-lead insight needs lead access).
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/pulse")
@Tag(name = "Pawan Pulse")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class PulseController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.PULSE_VIEW + "')";
    private static final String CAN_MANAGE = "hasRole('SUPER_ADMIN') or hasRole('ADMIN')";

    /** The queries order by urgency themselves (own items first, then score, then freshness); the page request carries no sort. */
    private static final Sort NO_SORT = Sort.unsorted();

    private final PulseService service;
    private final PulseEngineOrchestrator orchestrator;

    public PulseController(PulseService service, PulseEngineOrchestrator orchestrator) {
        this.service = service;
        this.orchestrator = orchestrator;
    }

    private static Pageable paging(Integer page, Integer size) {
        return Paging.of(page, size, null, Map.of(), NO_SORT);
    }

    @GetMapping("/feed")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Personalised insight feed: your own action items first, then what you may see, most urgent first. "
            + "Requires PULSE_VIEW; insights about records you cannot see are left out.")
    public PageResponse<PulseService.InsightRow> feed(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return PageResponse.from(service.getFeed(CurrentUser.require(), paging(page, size)), Function.identity());
    }

    @GetMapping("/risks")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Active RISK insights, most urgent first. Requires PULSE_VIEW.")
    public PageResponse<PulseService.InsightRow> risks(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return PageResponse.from(service.getByType(CurrentUser.require(), PulseInsightType.RISK, paging(page, size)), Function.identity());
    }

    @GetMapping("/opportunities")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Active OPPORTUNITY insights. Requires PULSE_VIEW.")
    public PageResponse<PulseService.InsightRow> opportunities(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return PageResponse.from(service.getByType(CurrentUser.require(), PulseInsightType.OPPORTUNITY, paging(page, size)), Function.identity());
    }

    @GetMapping("/achievements")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Recent ACHIEVEMENT insights. Requires PULSE_VIEW.")
    public PageResponse<PulseService.InsightRow> achievements(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return PageResponse.from(service.getByType(CurrentUser.require(), PulseInsightType.ACHIEVEMENT, paging(page, size)), Function.identity());
    }

    @GetMapping("/actions")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Next Best Action insights, your own first. Requires PULSE_VIEW.")
    public PageResponse<PulseService.InsightRow> actions(@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        return PageResponse.from(service.getByType(CurrentUser.require(), PulseInsightType.NEXT_BEST_ACTION, paging(page, size)), Function.identity());
    }

    @PutMapping("/{id}/dismiss")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Dismiss an insight: removes it from the feed. Only an insight you may see can be dismissed. Requires PULSE_VIEW.")
    public PulseService.InsightRow dismiss(@PathVariable UUID id) {
        return service.dismiss(id, CurrentUser.require());
    }

    @PutMapping("/{id}/actioned")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Mark an insight as actioned. Only an insight you may see can be actioned. Requires PULSE_VIEW.")
    public PulseService.InsightRow markActioned(@PathVariable UUID id) {
        return service.markActioned(id, CurrentUser.require());
    }

    @GetMapping("/stats")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Count of active insights you may see, grouped by type. Requires PULSE_VIEW.")
    public PulseService.PulseStats stats() {
        return service.getStats(CurrentUser.require());
    }

    @PostMapping("/refresh")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Run the insight engines now for the organization. Admin only.")
    public ResponseEntity<Void> refresh() {
        orchestrator.refreshFeed(CurrentUser.require().organizationId());
        return ResponseEntity.noContent().build();
    }
}
