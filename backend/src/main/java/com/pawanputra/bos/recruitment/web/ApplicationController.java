package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.recruitment.internal.ApplicationService;
import com.pawanputra.bos.recruitment.internal.InterviewService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/applications")
@Tag(name = "Recruitment - Applications")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class ApplicationController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.RECRUITMENT_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.RECRUITMENT_MANAGE + "')";

    private final ApplicationService applicationService;
    private final InterviewService interviewService;
    private final RecruitmentViewAssembler assembler;

    public ApplicationController(ApplicationService applicationService, InterviewService interviewService,
            RecruitmentViewAssembler assembler) {
        this.applicationService = applicationService;
        this.interviewService = interviewService;
        this.assembler = assembler;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List all applications for the organization. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.ApplicationView> listAll() {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.applications(orgId, applicationService.listAll(orgId));
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create an application. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<RecruitmentViews.ApplicationView> create(
            @Valid @RequestBody RecruitmentDtos.CreateApplicationRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        var app = applicationService.create(orgId, request.toCommand());
        return ResponseEntity.created(URI.create(ApiPaths.V1 + "/applications/" + app.getId()))
                .body(assembler.application(orgId, app));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get an application with its candidate, job, and interviews. Requires RECRUITMENT_VIEW.")
    public RecruitmentViews.ApplicationDetailView get(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.detail(orgId, applicationService.getWithDetails(orgId, id));
    }

    @PutMapping("/{id}/stage")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Advance an application to the next stage. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.ApplicationView advanceStage(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.AdvanceStageRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.application(orgId, applicationService.advanceStage(orgId, id, request.stage(), request.notes()));
    }

    @PutMapping("/{id}/hire")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Hire a selected candidate. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.ApplicationView hire(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.application(orgId, applicationService.hire(orgId, id));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Reject an application. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.ApplicationView reject(@PathVariable UUID id,
            @RequestBody(required = false) RecruitmentDtos.RejectRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        String reason = request != null ? request.reason() : null;
        return assembler.application(orgId, applicationService.reject(orgId, id, reason));
    }

    @GetMapping("/{id}/interviews")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List interviews for an application. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.InterviewView> listInterviews(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        // Verify application belongs to org
        applicationService.getById(orgId, id);
        return assembler.interviews(orgId, interviewService.listByApplication(id));
    }

    @PostMapping("/{id}/interviews")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Schedule an interview for an application. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<RecruitmentViews.InterviewView> scheduleInterview(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.ScheduleInterviewRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        var interview = interviewService.schedule(orgId, id, request.toCommand());
        return ResponseEntity.created(URI.create(ApiPaths.V1 + "/interviews/" + interview.getId()))
                .body(assembler.interview(orgId, interview));
    }
}
