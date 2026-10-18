package com.pawanputra.bos.intelligence.internal;

import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Nightly job that recomputes the customer intelligence snapshot for every customer in every
 * active organisation. Runs at 03:00 UTC each day.
 */
@Component
public class CustomerIntelligenceRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(CustomerIntelligenceRefreshJob.class);

    private final CustomerIntelligenceService service;
    private final JdbcClient jdbc;

    public CustomerIntelligenceRefreshJob(CustomerIntelligenceService service, JdbcClient jdbc) {
        this.service = service;
        this.jdbc = jdbc;
    }

    @Scheduled(cron = "0 0 3 * * *")
    public void refreshAll() {
        List<UUID> orgIds = jdbc.sql("SELECT id FROM organizations WHERE active = true")
                .query(UUID.class)
                .list();

        log.info("Starting nightly customer intelligence refresh for {} organisations", orgIds.size());
        for (UUID orgId : orgIds) {
            try {
                service.recomputeAll(orgId);
            } catch (Exception ex) {
                log.error("Intelligence refresh failed for org {}: {}", orgId, ex.getMessage(), ex);
            }
        }
        log.info("Nightly customer intelligence refresh complete");
    }
}
