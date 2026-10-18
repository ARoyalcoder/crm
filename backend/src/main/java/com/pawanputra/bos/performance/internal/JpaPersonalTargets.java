package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.PersonalTargets;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Finds the user's employee profile and reads that month's target-versus-actual summary from the performance service. */
@Component
class JpaPersonalTargets implements PersonalTargets {

    private final EntityManager em;
    private final PerformanceTargetService targets;

    JpaPersonalTargets(EntityManager em, PerformanceTargetService targets) {
        this.em = em;
        this.targets = targets;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Progress> monthlyTargets(UUID organizationId, UUID userId, LocalDate day) {
        @SuppressWarnings("unchecked")
        List<Object> profile = em.createNativeQuery("SELECT id FROM employee_profiles WHERE user_id = :userId AND organization_id = :orgId")
                .setParameter("userId", userId)
                .setParameter("orgId", organizationId)
                .getResultList();
        if (profile.isEmpty()) {
            return List.of();
        }
        UUID employeeId = (UUID) profile.get(0);
        return targets.getPerformanceSummary(organizationId, employeeId, day.getYear(), day.getMonthValue()).stream()
                .map(e -> new Progress(e.targetType(), e.targetValue(),
                        e.tracked() ? e.actual() : null, e.tracked() ? e.achievementPct() : null, e.tracked()))
                .toList();
    }
}
