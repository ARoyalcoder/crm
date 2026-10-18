package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.events.api.BusinessEventType;
import com.pawanputra.bos.events.api.EventCountPort;
import com.pawanputra.bos.rewards.api.AchievementCategory;
import com.pawanputra.bos.rewards.internal.UserAchievementRepository.LeaderboardEntry;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Processes business events and awards {@link UserAchievement} records when rules match.
 */
@Service
@Transactional
public class AchievementService {

    private static final Logger log = LoggerFactory.getLogger(AchievementService.class);

    private final AchievementRuleRepository rules;
    private final UserAchievementRepository achievements;
    private final EventCountPort eventCounts;

    public AchievementService(AchievementRuleRepository rules,
                               UserAchievementRepository achievements,
                               EventCountPort eventCounts) {
        this.rules = rules;
        this.achievements = achievements;
        this.eventCounts = eventCounts;
    }

    /**
     * Evaluate all active rules matching the event type and award achievements if applicable.
     *
     * @param userId     the user who triggered the event (actor)
     * @param eventType  the event that just occurred
     * @param entityId   the entity that was affected
     * @param orgId      the organisation scope
     */
    public void processEvent(UUID userId, BusinessEventType eventType, UUID entityId, UUID orgId) {
        if (userId == null) {
            return; // system events have no actor to award
        }

        List<AchievementRule> matchingRules =
                rules.findAllByOrganizationIdAndTriggerEventTypeAndActive(
                        orgId, eventType.name(), true);

        for (AchievementRule rule : matchingRules) {
            try {
                if (rule.getCategory() == AchievementCategory.FIRST_MILESTONE) {
                    checkAndAwardFirstMilestone(userId, rule, entityId, orgId);
                } else if (rule.getCategory() == AchievementCategory.COUNT_MILESTONE
                        && rule.getTriggerThreshold() != null) {
                    checkAndAwardCountMilestone(userId, rule, eventType, entityId, orgId);
                }
            } catch (Exception e) {
                log.error("[REWARDS] Failed to process rule {} for user {} event {}",
                        rule.getId(), userId, eventType.name(), e);
            }
        }
    }

    /**
     * Award a FIRST_MILESTONE achievement only once per user+rule combination.
     */
    public void checkAndAwardFirstMilestone(UUID userId, AchievementRule rule,
                                             UUID entityId, UUID orgId) {
        if (achievements.existsByUserIdAndRuleId(userId, rule.getId())) {
            return; // already earned
        }
        String context = entityId != null
                ? "{\"entityId\":\"" + entityId + "\"}"
                : null;
        achievements.save(new UserAchievement(orgId, userId, rule.getId(), context));
        log.info("[REWARDS] User {} earned first-milestone achievement '{}' (rule {})",
                userId, rule.getName(), rule.getId());
    }

    /**
     * Award a COUNT_MILESTONE achievement when the user's total event count for the trigger event type
     * crosses the next multiple of {@code rule.getTriggerThreshold()}.
     *
     * <p>Example: threshold = 10. We award at event counts 10, 20, 30, …
     */
    public void checkAndAwardCountMilestone(UUID userId, AchievementRule rule,
                                             BusinessEventType eventType,
                                             UUID entityId, UUID orgId) {
        int threshold = rule.getTriggerThreshold();
        long totalEvents = eventCounts.countEvents(userId, eventType, orgId);
        long existingAwards = achievements.countByUserIdAndRuleId(userId, rule.getId());

        // Award if total events has just crossed the next multiple of the threshold
        long nextAwardAt = (existingAwards + 1) * threshold;
        if (totalEvents >= nextAwardAt) {
            String context = "{\"threshold\":" + threshold
                    + ",\"totalEvents\":" + totalEvents
                    + ",\"award\":" + (existingAwards + 1)
                    + (entityId != null ? ",\"entityId\":\"" + entityId + "\"" : "") + "}";
            achievements.save(new UserAchievement(orgId, userId, rule.getId(), context));
            log.info("[REWARDS] User {} earned count-milestone achievement '{}' at {} events (award #{}, rule {})",
                    userId, rule.getName(), totalEvents, existingAwards + 1, rule.getId());
        }
    }

    @Transactional(readOnly = true)
    public List<UserAchievement> getUserAchievements(UUID userId, UUID orgId) {
        return achievements.findAllByUserIdAndOrganizationId(userId, orgId);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getLeaderboard(UUID orgId) {
        return achievements.findLeaderboard(orgId);
    }
}
