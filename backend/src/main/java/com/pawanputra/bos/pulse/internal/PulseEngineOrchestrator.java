package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.pulse.api.PulseInsightStatus;
import com.pawanputra.bos.pulse.api.PulseInsightType;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Runs the four PAWAN PULSE engines and keeps the feed in step with what they find.
 *
 * <ul>
 *   <li>Each engine runs on its own: if one fails (and it is logged with the organization), the others still
 *       produce their insights and the failed engine's existing insights are left alone, not wrongly retired.</li>
 *   <li>An insight about a record that already has an active insight of the same kind is <em>refreshed</em> in place
 *       (newer figures, back to the top of the feed) rather than duplicated.</li>
 *   <li>A risk, opportunity or recommended action that the engine no longer finds (the invoice was paid, the project
 *       finished, the ticket resolved) is retired, so the feed never nags about something already dealt with.
 *       Achievements are events: they stay for a week.</li>
 * </ul>
 *
 * <p>A daily job at 07:00 business time refreshes every active organization.
 */
@Service
public class PulseEngineOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(PulseEngineOrchestrator.class);

    /** How long an insight stays relevant without being regenerated, and how long an achievement is celebrated. */
    private static final Duration LIFETIME = Duration.ofDays(7);

    private final Map<PulseInsightType, Function<UUID, List<PulseInsight>>> engines;
    private final PulseInsightRepository repository;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final PulseCalendar calendar;

    PulseEngineOrchestrator(
            AchievementEngine achievementEngine,
            OpportunityEngine opportunityEngine,
            RiskEngine riskEngine,
            NextBestActionEngine nextBestActionEngine,
            PulseInsightRepository repository,
            JdbcTemplate jdbc,
            TransactionTemplate transaction,
            PulseCalendar calendar) {
        this.engines = Map.of(
                PulseInsightType.ACHIEVEMENT, achievementEngine::generate,
                PulseInsightType.OPPORTUNITY, opportunityEngine::generate,
                PulseInsightType.RISK, riskEngine::generate,
                PulseInsightType.NEXT_BEST_ACTION, nextBestActionEngine::generate);
        this.repository = repository;
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.calendar = calendar;
    }

    /** Generates fresh insights for one organization and reconciles the feed with them. */
    public void refreshFeed(UUID orgId) {
        List<PulseInsight> candidates = new ArrayList<>();
        Set<PulseInsightType> succeeded = EnumSet.noneOf(PulseInsightType.class);
        for (Map.Entry<PulseInsightType, Function<UUID, List<PulseInsight>>> engine : engines.entrySet()) {
            try {
                candidates.addAll(engine.getValue().apply(orgId));
                succeeded.add(engine.getKey());
            } catch (RuntimeException ex) {
                log.error("PAWAN PULSE: the {} engine failed for org={}; its existing insights are left as they are", engine.getKey(), orgId, ex);
            }
        }
        transaction.executeWithoutResult(status -> reconcile(orgId, candidates, succeeded));
    }

    private void reconcile(UUID orgId, List<PulseInsight> candidates, Set<PulseInsightType> succeeded) {
        Instant now = calendar.now();
        List<PulseInsight> active = repository.findAllByOrganizationIdAndStatus(orgId, PulseInsightStatus.ACTIVE);
        Map<String, PulseInsight> existing = new HashMap<>();
        for (PulseInsight insight : active) {
            existing.put(keyOf(insight), insight);
        }

        Set<String> seen = new HashSet<>();
        int created = 0;
        int refreshed = 0;
        for (PulseInsight candidate : candidates) {
            String key = keyOf(candidate);
            if (!seen.add(key)) {
                continue; // two rules found the same record for the same reason
            }
            PulseInsight current = existing.get(key);
            if (current == null) {
                candidate.setGeneratedAt(now);
                candidate.setExpiresAt(now.plus(LIFETIME));
                repository.save(candidate);
                created++;
            } else {
                current.refreshFrom(candidate, now, now.plus(LIFETIME));
                refreshed++;
            }
        }

        int retired = 0;
        for (PulseInsight insight : active) {
            if (seen.contains(keyOf(insight))) {
                continue;
            }
            boolean achievement = insight.getType() == PulseInsightType.ACHIEVEMENT;
            boolean stale = achievement
                    ? insight.getGeneratedAt().isBefore(now.minus(LIFETIME))
                    : succeeded.contains(insight.getType());
            if (stale) {
                insight.expire();
                retired++;
            }
        }
        repository.saveAll(active);
        log.info("PAWAN PULSE: org={} created {}, refreshed {}, retired {} (engines run: {})", orgId, created, refreshed, retired, succeeded);
    }

    /** An insight is about one record for one reason: its category and the record. */
    private static String keyOf(PulseInsight insight) {
        return insight.getCategory() + "|" + (insight.getEntityId() != null ? insight.getEntityId() : insight.getTitle());
    }

    /** Daily morning job: refreshes insights for every active organization. Runs at 07:00 business time. */
    @Scheduled(cron = "0 0 7 * * *", zone = "${app.finance.time-zone:Asia/Kolkata}")
    public void dailyRefresh() {
        log.info("PAWAN PULSE: starting the daily refresh");
        List<UUID> orgIds = jdbc.queryForList("SELECT DISTINCT id FROM organizations WHERE status = 'ACTIVE'", UUID.class);
        for (UUID orgId : orgIds) {
            try {
                refreshFeed(orgId);
            } catch (RuntimeException ex) {
                log.error("PAWAN PULSE: the refresh failed for org={}", orgId, ex);
            }
        }
        log.info("PAWAN PULSE: daily refresh finished for {} organizations", orgIds.size());
    }
}
