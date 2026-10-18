package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.recruitment.api.ApplicationStage;
import com.pawanputra.bos.recruitment.api.JobStatus;
import com.pawanputra.bos.recruitment.internal.ApplicationService;
import com.pawanputra.bos.recruitment.internal.JobOpeningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/jobs")
@Tag(name = "Recruitment - Jobs")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class JobOpeningController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.RECRUITMENT_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.RECRUITMENT_MANAGE + "')";

    private final JobOpeningService jobService;
    private final ApplicationService applicationService;
    private final RecruitmentViewAssembler assembler;

    public JobOpeningController(JobOpeningService jobService, ApplicationService applicationService,
            RecruitmentViewAssembler assembler) {
        this.jobService = jobService;
        this.applicationService = applicationService;
        this.assembler = assembler;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List job openings with how many people applied to each. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.JobOpeningView> list(@RequestParam(required = false) JobStatus status) {
        UUID orgId = CurrentUser.require().organizationId();
        Map<UUID, Long> counts = applicationService.countsByJob(orgId);
        return jobService.listAll(orgId, status).stream()
                .map(job -> RecruitmentViews.JobOpeningView.from(job, counts.getOrDefault(job.getId(), 0L)))
                .toList();
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a job opening. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<RecruitmentViews.JobOpeningView> create(@Valid @RequestBody RecruitmentDtos.JobRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        var job = jobService.create(orgId, request.toDetails());
        return ResponseEntity.created(URI.create(ApiPaths.V1 + "/jobs/" + job.getId()))
                .body(RecruitmentViews.JobOpeningView.from(job));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a job opening by ID. Requires RECRUITMENT_VIEW.")
    public RecruitmentViews.JobOpeningView get(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return RecruitmentViews.JobOpeningView.from(jobService.getById(orgId, id), applicationService.countForJob(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a job opening. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.JobOpeningView update(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.JobRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return RecruitmentViews.JobOpeningView.from(jobService.update(orgId, id, request.toDetails()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete a job opening. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        jobService.delete(orgId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/applications")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List applications for a job, optionally filtered by stage. Requires RECRUITMENT_VIEW.")
    public List<RecruitmentViews.ApplicationView> applications(@PathVariable UUID id,
            @RequestParam(required = false) ApplicationStage stage) {
        // Verify job belongs to org before returning applications
        UUID orgId = CurrentUser.require().organizationId();
        jobService.getById(orgId, id);
        return assembler.applications(orgId, applicationService.listByJob(id, stage));
    }
}
