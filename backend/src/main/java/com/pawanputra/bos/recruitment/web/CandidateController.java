package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.recruitment.internal.ApplicationService;
import com.pawanputra.bos.recruitment.internal.CandidateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
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
@RequestMapping(ApiPaths.V1 + "/candidates")
@Tag(name = "Recruitment - Candidates")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class CandidateController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.RECRUITMENT_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.RECRUITMENT_MANAGE + "')";

    private final CandidateService candidateService;
    private final ApplicationService applicationService;
    private final RecruitmentViewAssembler assembler;

    public CandidateController(CandidateService candidateService, ApplicationService applicationService,
            RecruitmentViewAssembler assembler) {
        this.candidateService = candidateService;
        this.applicationService = applicationService;
        this.assembler = assembler;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List candidates. Optional search by name or email. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.CandidateView> list(@RequestParam(required = false) String search) {
        UUID orgId = CurrentUser.require().organizationId();
        return candidateService.listAll(orgId, search).stream()
                .map(RecruitmentViews.CandidateView::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a candidate. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<RecruitmentViews.CandidateView> create(
            @Valid @RequestBody RecruitmentDtos.CandidateRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        var candidate = candidateService.create(orgId, request.toDetails());
        return ResponseEntity.created(URI.create(ApiPaths.V1 + "/candidates/" + candidate.getId()))
                .body(RecruitmentViews.CandidateView.from(candidate));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a candidate by ID. Requires RECRUITMENT_VIEW.")
    public RecruitmentViews.CandidateView get(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return RecruitmentViews.CandidateView.from(candidateService.getById(orgId, id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a candidate. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.CandidateView update(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.CandidateRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return RecruitmentViews.CandidateView.from(candidateService.update(orgId, id, request.toDetails()));
    }

    @GetMapping("/{id}/applications")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all applications for a candidate. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.ApplicationView> applications(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        // Verify candidate belongs to org
        candidateService.getById(orgId, id);
        return assembler.applications(orgId, applicationService.listByCandidate(id));
    }
}
