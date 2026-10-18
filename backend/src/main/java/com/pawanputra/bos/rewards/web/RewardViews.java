package com.pawanputra.bos.rewards.web;

import com.pawanputra.bos.rewards.api.AchievementCategory;
import com.pawanputra.bos.rewards.api.BadgeLevel;
import com.pawanputra.bos.rewards.api.RewardTransactionType;
import com.pawanputra.bos.rewards.internal.AchievementRule;
import com.pawanputra.bos.rewards.internal.CustomerReward;
import com.pawanputra.bos.rewards.internal.RewardTransaction;
import com.pawanputra.bos.rewards.internal.UserAchievement;
import com.pawanputra.bos.rewards.internal.UserAchievementRepository.LeaderboardEntry;
import java.time.Instant;
import java.util.UUID;

/** Immutable read-model records returned by the rewards controllers. */
public final class RewardViews {

    private RewardViews() {
    }

    public record AchievementRuleView(
            UUID id,
            UUID organizationId,
            String name,
            String description,
            AchievementCategory category,
            String triggerEventType,
            Integer triggerThreshold,
            int employeePoints,
            BadgeLevel badgeLevel,
            boolean active,
            String createdBy,
            Instant createdAt,
            String updatedBy,
            Instant updatedAt) {

        static AchievementRuleView from(AchievementRule r) {
            return new AchievementRuleView(
                    r.getId(), r.getOrganizationId(), r.getName(), r.getDescription(),
                    r.getCategory(), r.getTriggerEventType(), r.getTriggerThreshold(),
                    r.getEmployeePoints(), r.getBadgeLevel(), r.isActive(),
                    r.getCreatedBy(), r.getCreatedAt(), r.getUpdatedBy(), r.getUpdatedAt());
        }
    }

    public record UserAchievementView(
            UUID id,
            UUID organizationId,
            UUID userId,
            UUID ruleId,
            Instant earnedAt,
            String context) {

        static UserAchievementView from(UserAchievement a) {
            return new UserAchievementView(
                    a.getId(), a.getOrganizationId(), a.getUserId(), a.getRuleId(),
                    a.getEarnedAt(), a.getContext());
        }
    }

    public record LeaderboardEntryView(
            UUID userId,
            long totalPoints,
            long achievementCount) {

        static LeaderboardEntryView from(LeaderboardEntry e) {
            return new LeaderboardEntryView(
                    e.getUserId(),
                    e.getTotalPoints() != null ? e.getTotalPoints() : 0L,
                    e.getAchievementCount() != null ? e.getAchievementCount() : 0L);
        }
    }

    public record CustomerRewardView(
            UUID id,
            UUID organizationId,
            UUID customerId,
            int totalPoints,
            String tier,
            Instant lastActivityAt,
            Instant createdAt,
            Instant updatedAt) {

        static CustomerRewardView from(CustomerReward r) {
            return new CustomerRewardView(
                    r.getId(), r.getOrganizationId(), r.getCustomerId(),
                    r.getTotalPoints(), r.getTier(), r.getLastActivityAt(),
                    r.getCreatedAt(), r.getUpdatedAt());
        }
    }

    public record RewardTransactionView(
            UUID id,
            UUID organizationId,
            UUID customerId,
            RewardTransactionType transactionType,
            int points,
            String reason,
            String referenceType,
            UUID referenceId,
            Instant createdAt) {

        static RewardTransactionView from(RewardTransaction t) {
            return new RewardTransactionView(
                    t.getId(), t.getOrganizationId(), t.getCustomerId(),
                    t.getTransactionType(), t.getPoints(), t.getReason(),
                    t.getReferenceType(), t.getReferenceId(), t.getCreatedAt());
        }
    }
}
