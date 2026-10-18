package com.pawanputra.bos.rewards.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.rewards.internal.AchievementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Rewards - User Achievements")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class UserAchievementController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.REWARDS_VIEW + "')";

    private final AchievementService service;

    public UserAchievementController(AchievementService service) {
        this.service = service;
    }

    @GetMapping(ApiPaths.V1 + "/users/{userId}/achievements")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get all achievements earned by a specific user")
    public List<RewardViews.UserAchievementView> getUserAchievements(@PathVariable UUID userId) {
        CurrentUser user = CurrentUser.require();
        return service.getUserAchievements(userId, user.organizationId())
                .stream()
                .map(RewardViews.UserAchievementView::from)
                .toList();
    }

    @GetMapping(ApiPaths.V1 + "/achievements/leaderboard")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Leaderboard: top employees ordered by total achievement points")
    public List<RewardViews.LeaderboardEntryView> getLeaderboard() {
        CurrentUser user = CurrentUser.require();
        return service.getLeaderboard(user.organizationId())
                .stream()
                .map(RewardViews.LeaderboardEntryView::from)
                .toList();
    }
}
