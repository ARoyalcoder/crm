package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.pulse.api.PulseInsightStatus;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Application service for the PAWAN PULSE feed: querying, dismissing and actioning insights. Every call is made
 * for a person and sees only what that person may see: an insight about an invoice is invisible to someone without
 * access to invoices, and the same holds for the counts and for dismissing.
 */
@Service
@Transactional(readOnly = true)
public class PulseService {

    // ------------------------------------------------------------------ output records

    /** Serialisable projection of a {@link PulseInsight}. */
    public record InsightRow(
            UUID id,
            UUID organizationId,
            String type,
            String category,
            String status,
            String title,
            String whatHappened,
            String whyItMatters,
            UUID whoShouldAct,
            String whoShouldActLabel,
            String whatToDo,
            String expectedImpact,
            String entityType,
            UUID entityId,
            String entityLabel,
            int score,
            Instant generatedAt,
            Instant expiresAt) {
    }

    public record PulseStats(
            long risks,
            long opportunities,
            long actions,
            long achievements) {
    }

    // ------------------------------------------------------------------ deps

    private final PulseInsightRepository repository;

    PulseService(PulseInsightRepository repository) {
        this.repository = repository;
    }

    private static Set<String> visibleTo(CurrentUser user) {
        return PulseVisibility.allowedEntityTypes(user.permissions());
    }

    // ------------------------------------------------------------------ queries

    /** The personalised feed: the caller's own action items first, then everything else they may see, most urgent first. */
    public Page<InsightRow> getFeed(CurrentUser user, Pageable pageable) {
        return repository.feed(user.organizationId(), user.id(), PulseInsightStatus.ACTIVE, visibleTo(user), pageable).map(this::toRow);
    }

    public Page<InsightRow> getByType(CurrentUser user, PulseInsightType type, Pageable pageable) {
        return repository.feedOfType(user.organizationId(), user.id(), PulseInsightStatus.ACTIVE, visibleTo(user), type, pageable).map(this::toRow);
    }

    public PulseStats getStats(CurrentUser user) {
        Map<PulseInsightType, Long> counts = new EnumMap<>(PulseInsightType.class);
        for (PulseInsightType t : PulseInsightType.values()) {
            counts.put(t, 0L);
        }
        repository.countByType(user.organizationId(), PulseInsightStatus.ACTIVE, visibleTo(user)).forEach(row -> {
            PulseInsightType type = row[0] instanceof PulseInsightType t ? t : PulseInsightType.valueOf(row[0].toString());
            counts.put(type, ((Number) row[1]).longValue());
        });
        return new PulseStats(
                counts.get(PulseInsightType.RISK),
                counts.get(PulseInsightType.OPPORTUNITY),
                counts.get(PulseInsightType.NEXT_BEST_ACTION),
                counts.get(PulseInsightType.ACHIEVEMENT));
    }

    // ------------------------------------------------------------------ mutations

    @Transactional
    public InsightRow dismiss(UUID id, CurrentUser user) {
        PulseInsight insight = require(id, user);
        insight.dismiss(user.id(), Instant.now());
        return toRow(repository.save(insight));
    }

    @Transactional
    public InsightRow markActioned(UUID id, CurrentUser user) {
        PulseInsight insight = require(id, user);
        insight.markActioned();
        return toRow(repository.save(insight));
    }

    // ------------------------------------------------------------------ helpers

    /** An insight the caller may see; for one they may not, the answer is the same "not found" as for one that does not exist. */
    private PulseInsight require(UUID id, CurrentUser user) {
        return repository.findVisible(id, user.organizationId(), visibleTo(user))
                .orElseThrow(() -> new ResourceNotFoundException("PulseInsight", id));
    }

    private InsightRow toRow(PulseInsight p) {
        return new InsightRow(
                p.getId(),
                p.getOrganizationId(),
                p.getType().name(),
                p.getCategory().name(),
                p.getStatus().name(),
                p.getTitle(),
                p.getWhatHappened(),
                p.getWhyItMatters(),
                p.getWhoShouldAct(),
                p.getWhoShouldActLabel(),
                p.getWhatToDo(),
                p.getExpectedImpact(),
                p.getEntityType(),
                p.getEntityId(),
                p.getEntityLabel(),
                p.getScore(),
                p.getGeneratedAt(),
                p.getExpiresAt());
    }
}
