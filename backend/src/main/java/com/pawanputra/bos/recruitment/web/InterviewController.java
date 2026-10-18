package com.pawanputra.bos.recruitment.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.recruitment.internal.InterviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/interviews")
@Tag(name = "Recruitment - Interviews")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class InterviewController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.RECRUITMENT_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.RECRUITMENT_MANAGE + "')";

    private final InterviewService interviewService;
    private final RecruitmentViewAssembler assembler;

    public InterviewController(InterviewService interviewService, RecruitmentViewAssembler assembler) {
        this.interviewService = interviewService;
        this.assembler = assembler;
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get an interview by ID. Requires RECRUITMENT_VIEW.")
    public RecruitmentViews.InterviewView get(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.interview(orgId, interviewService.getById(orgId, id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update (reschedule) an interview. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.InterviewView update(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.ScheduleInterviewRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.interview(orgId, interviewService.update(orgId, id, request.toCommand()));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Mark an interview as completed with feedback and rating. Requires RECRUITMENT_MANAGE.")
    public RecruitmentViews.InterviewView complete(@PathVariable UUID id,
            @Valid @RequestBody RecruitmentDtos.CompleteInterviewRequest request) {
        UUID orgId = CurrentUser.require().organizationId();
        return assembler.interview(orgId, interviewService.complete(orgId, id, request.toCommand()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Cancel (delete) an interview. Requires RECRUITMENT_MANAGE.")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        UUID orgId = CurrentUser.require().organizationId();
        interviewService.cancel(orgId, id);
        return ResponseEntity.noContent().build();
    }
}
