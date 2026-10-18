package com.pawanputra.bos.rewards.internal;

import com.pawanputra.bos.platform.persistence.AuditableEntity;
import com.pawanputra.bos.rewards.api.AchievementCategory;
import com.pawanputra.bos.rewards.api.BadgeLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Configurable rule that defines WHEN an achievement fires and what it awards.
 *
 * <p>The {@link #triggerEventType} matches a {@code BusinessEventType.name()} value.
 * When {@link #triggerThreshold} is null the rule is a FIRST_MILESTONE; when set it is a
 * COUNT_MILESTONE that fires after the actor has generated that many events of the given type.
 */
@Entity
@Table(name = "achievement_rules")
public class AchievementRule extends AuditableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private AchievementCategory category;

    /** Stored as {@code BusinessEventType.name()} so it survives enum renames. */
    @Column(name = "trigger_event_type", nullable = false, length = 100)
    private String triggerEventType;

    /** Null means the first occurrence fires the rule; non-null means fire after N occurrences. */
    @Column(name = "trigger_threshold")
    private Integer triggerThreshold;

    /** Points awarded to the employee who triggered the event; 0 if not applicable. */
    @Column(name = "employee_points", nullable = false)
    private int employeePoints;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_level", length = 20)
    private BadgeLevel badgeLevel;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected AchievementRule() {
        // for JPA
    }

    public AchievementRule(
            UUID organizationId,
            String name,
            String description,
            AchievementCategory category,
            String triggerEventType,
            Integer triggerThreshold,
            int employeePoints,
            BadgeLevel badgeLevel) {
        this.organizationId = organizationId;
        this.name = name;
        this.description = description;
        this.category = category;
        this.triggerEventType = triggerEventType;
        this.triggerThreshold = triggerThreshold;
        this.employeePoints = employeePoints;
        this.badgeLevel = badgeLevel;
        this.active = true;
    }

    // ---- Getters ----

    public UUID getOrganizationId() { return organizationId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public AchievementCategory getCategory() { return category; }
    public String getTriggerEventType() { return triggerEventType; }
    public Integer getTriggerThreshold() { return triggerThreshold; }
    public int getEmployeePoints() { return employeePoints; }
    public BadgeLevel getBadgeLevel() { return badgeLevel; }
    public boolean isActive() { return active; }

    // ---- Mutators ----

    public void update(
            String name,
            String description,
            AchievementCategory category,
            String triggerEventType,
            Integer triggerThreshold,
            int employeePoints,
            BadgeLevel badgeLevel) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.triggerEventType = triggerEventType;
        this.triggerThreshold = triggerThreshold;
        this.employeePoints = employeePoints;
        this.badgeLevel = badgeLevel;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
