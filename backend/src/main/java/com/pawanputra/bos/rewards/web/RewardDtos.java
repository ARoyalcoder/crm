package com.pawanputra.bos.rewards.web;

import com.pawanputra.bos.rewards.api.AchievementCategory;
import com.pawanputra.bos.rewards.api.BadgeLevel;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** Request DTOs for the rewards module. */
public final class RewardDtos {

    private RewardDtos() {
    }

    public record SaveAchievementRuleRequest(
            @NotBlank String name,
            String description,
            @NotNull AchievementCategory category,
            @NotBlank String triggerEventType,
            @Min(1) Integer triggerThreshold,
            @Min(0) int employeePoints,
            BadgeLevel badgeLevel) {
    }

    public record AddPointsRequest(
            @Positive int points,
            @NotBlank String reason,
            String referenceType,
            String referenceId) {
    }

    public record RedeemPointsRequest(
            @Positive int points,
            @NotBlank String reason) {
    }
}
