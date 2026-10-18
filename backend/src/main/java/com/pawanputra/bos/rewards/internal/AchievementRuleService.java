package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.rewards.api.AchievementCategory;
import com.pawanputra.bos.rewards.api.BadgeLevel;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** CRUD service for {@link AchievementRule}s. */
@Service
@Transactional
public class AchievementRuleService {

    /** Command record for creating or updating a rule. */
    public record SaveRuleCmd(
            String name,
            String description,
            AchievementCategory category,
            String triggerEventType,
            Integer triggerThreshold,
            int employeePoints,
            BadgeLevel badgeLevel) {
    }

    private final AchievementRuleRepository rules;

    public AchievementRuleService(AchievementRuleRepository rules) {
        this.rules = rules;
    }

    public AchievementRule create(UUID organizationId, SaveRuleCmd cmd) {
        return rules.save(new AchievementRule(
                organizationId,
                cmd.name(),
                cmd.description(),
                cmd.category(),
                cmd.triggerEventType(),
                cmd.triggerThreshold(),
                cmd.employeePoints(),
                cmd.badgeLevel()));
    }

    public AchievementRule update(UUID organizationId, UUID id, SaveRuleCmd cmd) {
        AchievementRule rule = get(organizationId, id);
        rule.update(
                cmd.name(),
                cmd.description(),
                cmd.category(),
                cmd.triggerEventType(),
                cmd.triggerThreshold(),
                cmd.employeePoints(),
                cmd.badgeLevel());
        return rules.save(rule);
    }

    public AchievementRule toggle(UUID organizationId, UUID id) {
        AchievementRule rule = get(organizationId, id);
        rule.setActive(!rule.isActive());
        return rules.save(rule);
    }

    public void delete(UUID organizationId, UUID id) {
        rules.delete(get(organizationId, id));
    }

    @Transactional(readOnly = true)
    public AchievementRule get(UUID organizationId, UUID id) {
        return rules.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new EntityNotFoundException("AchievementRule not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<AchievementRule> listAll(UUID organizationId, Boolean activeFilter) {
        if (activeFilter != null) {
            return rules.findAllByOrganizationIdAndActive(organizationId, activeFilter);
        }
        return rules.findAllByOrganizationId(organizationId);
    }
}
