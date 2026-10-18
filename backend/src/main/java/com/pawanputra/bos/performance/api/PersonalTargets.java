package com.pawanputra.bos.performance.api;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A person's own targets for a month, against what they actually achieved. Anyone may read their own
 * (it is not a management view), which is why this exists apart from the performance endpoints, which
 * need PERFORMANCE_VIEW to read anyone's.
 */
public interface PersonalTargets {

    /**
     * @param actual         what was achieved, or {@code null} when the system does not measure this kind of target yet
     * @param achievementPct actual as a share of the target, or {@code null} when not measured
     */
    record Progress(TargetType type, BigDecimal target, BigDecimal actual, BigDecimal achievementPct, boolean tracked) {
    }

    /** The user's monthly targets for the month containing {@code day}. Empty when the user has no employee profile or no targets. */
    List<Progress> monthlyTargets(UUID organizationId, UUID userId, LocalDate day);
}
