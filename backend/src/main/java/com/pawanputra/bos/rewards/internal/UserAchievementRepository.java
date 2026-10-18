package com.pawanputra.bos.rewards.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, UUID> {

    List<UserAchievement> findAllByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    Optional<UserAchievement> findByUserIdAndRuleId(UUID userId, UUID ruleId);

    boolean existsByUserIdAndRuleId(UUID userId, UUID ruleId);

    /** Count how many achievements of a given rule a user already has (for count milestones). */
    long countByUserIdAndRuleId(UUID userId, UUID ruleId);

    /** Leaderboard: top users ordered by total points earned from all their achievements. */
    @Query("""
            SELECT ua.userId as userId,
                   SUM(ar.employeePoints) as totalPoints,
                   COUNT(ua.id) as achievementCount
            FROM UserAchievement ua
            JOIN AchievementRule ar ON ar.id = ua.ruleId
            WHERE ua.organizationId = :orgId
            GROUP BY ua.userId
            ORDER BY SUM(ar.employeePoints) DESC
            """)
    List<LeaderboardEntry> findLeaderboard(@Param("orgId") UUID orgId);

    /** Projection used by the leaderboard query. */
    interface LeaderboardEntry {
        UUID getUserId();
        Long getTotalPoints();
        Long getAchievementCount();
    }
}
