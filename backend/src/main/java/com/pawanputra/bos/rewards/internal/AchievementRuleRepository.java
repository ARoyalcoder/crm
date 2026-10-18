package com.pawanputra.bos.rewards.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AchievementRuleRepository extends JpaRepository<AchievementRule, UUID> {

    Optional<AchievementRule> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<AchievementRule> findAllByOrganizationId(UUID organizationId);

    List<AchievementRule> findAllByOrganizationIdAndActive(UUID organizationId, boolean active);

    /** Active rules that match the given trigger event type. */
    List<AchievementRule> findAllByOrganizationIdAndTriggerEventTypeAndActive(
            UUID organizationId, String triggerEventType, boolean active);
}
