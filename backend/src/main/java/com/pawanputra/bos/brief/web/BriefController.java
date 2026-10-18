package com.pawanputra.bos.brief.web;

import com.pawanputra.bos.brief.internal.BriefResponse;
import com.pawanputra.bos.brief.internal.DailyBriefService;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/brief")
@Tag(name = "Daily brief")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class BriefController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.BRIEF_VIEW + "')";

    private final DailyBriefService dailyBriefService;

    public BriefController(DailyBriefService dailyBriefService) {
        this.dailyBriefService = dailyBriefService;
    }

    @GetMapping("/daily")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Today's brief for the signed-in user. Requires BRIEF_VIEW; each section also needs the permission of the module it summarises.")
    public BriefResponse daily() {
        return dailyBriefService.generate(CurrentUser.require());
    }
}
