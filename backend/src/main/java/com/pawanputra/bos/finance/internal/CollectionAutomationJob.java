package com.pawanputra.bos.finance.internal;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs daily at 06:00 to create collection tasks for overdue invoices and log escalation notices
 * for invoices overdue beyond the escalation threshold.
 *
 * <p>For each organization that has a config, it:
 * <ol>
 *   <li>Finds invoices overdue more than {@link ReceivablesConfig#getOverdueDays1()} days with no
 *       open task → auto-creates a HIGH-priority collection task.
 *   <li>Finds invoices overdue more than {@link ReceivablesConfig#getOverdueDays2()} days and
 *       escalation is enabled → logs the escalation (a future notification service will act on it).
 * </ol>
 */
@Component
public class CollectionAutomationJob {

    private static final Logger log = LoggerFactory.getLogger(CollectionAutomationJob.class);

    private final JdbcTemplate jdbc;
    private final CollectionTaskRepository collectionTaskRepository;
    private final ReceivablesConfigRepository receivablesConfigRepository;

    public CollectionAutomationJob(JdbcTemplate jdbc,
            CollectionTaskRepository collectionTaskRepository,
            ReceivablesConfigRepository receivablesConfigRepository) {
        this.jdbc = jdbc;
        this.collectionTaskRepository = collectionTaskRepository;
        this.receivablesConfigRepository = receivablesConfigRepository;
    }

    @Scheduled(cron = "0 0 6 * * *") // runs at 06:00 every day
    @Transactional
    public void processOverdueInvoices() {
        log.info("Collection automation job started");
        try {
            LocalDate today = LocalDate.now();
            Date day = Date.valueOf(today);

            List<ReceivablesConfig> configs = receivablesConfigRepository.findAll();
            for (ReceivablesConfig config : configs) {
                processOrganization(config, day);
            }

            log.info("Collection automation job completed for {} organizations", configs.size());
        } catch (Exception e) {
            log.error("Collection automation job failed", e);
        }
    }

    private void processOrganization(ReceivablesConfig config, Date day) {
        UUID orgId = config.getOrganizationId();

        if (config.isCollectionTaskEnabled()) {
            createTasksForOverdueInvoices(orgId, config.getOverdueDays1(), day);
        }

        if (config.isEscalationEnabled()) {
            logEscalationForVeryOverdueInvoices(orgId, config.getOverdueDays2(), day,
                    config.getEscalationUserId());
        }
    }

    private void createTasksForOverdueInvoices(UUID orgId, int thresholdDays, Date day) {
        // Get invoice IDs that already have an open or in-progress collection task
        List<UUID> invoicesWithOpenTasks = collectionTaskRepository.findInvoiceIdsWithOpenTasks(orgId,
                Set.of(CollectionTask.Status.OPEN, CollectionTask.Status.IN_PROGRESS));

        // Find overdue invoices past the threshold that don't already have an open task
        List<UUID[]> overdue = jdbc.query(
                "SELECT id, customer_id FROM invoices "
                        + "WHERE organization_id = ? "
                        + "AND status IN ('ISSUED', 'PARTIALLY_PAID') "
                        + "AND deleted_at IS NULL "
                        + "AND due_date < ? "
                        + "AND (CURRENT_DATE - due_date) > ?",
                (row, idx) -> new UUID[]{
                        row.getObject("id", UUID.class),
                        row.getObject("customer_id", UUID.class)
                },
                orgId, day, thresholdDays);

        int created = 0;
        for (UUID[] pair : overdue) {
            UUID invoiceId = pair[0];
            UUID customerId = pair[1];

            if (invoicesWithOpenTasks.contains(invoiceId)) {
                continue;
            }

            CollectionTask task = new CollectionTask(orgId, invoiceId, customerId);
            task.setPriority(CollectionTask.Priority.HIGH);
            collectionTaskRepository.save(task);
            created++;
            log.debug("Auto-created collection task for invoice {} (org {})", invoiceId, orgId);
        }

        if (created > 0) {
            log.info("Created {} auto collection tasks for org {}", created, orgId);
        }
    }

    private void logEscalationForVeryOverdueInvoices(UUID orgId, int thresholdDays,
            Date day, UUID escalationUserId) {
        Long count = jdbc.queryForObject(
                "SELECT count(*) FROM invoices "
                        + "WHERE organization_id = ? "
                        + "AND status IN ('ISSUED', 'PARTIALLY_PAID') "
                        + "AND deleted_at IS NULL "
                        + "AND due_date < ? "
                        + "AND (CURRENT_DATE - due_date) > ?",
                Long.class, orgId, day, thresholdDays);

        if (count != null && count > 0) {
            // Log the escalation event for future notification integration to pick up.
            log.warn("ESCALATION_NEEDED org={} overdueCount={} thresholdDays={} escalationUser={}",
                    orgId, count, thresholdDays, escalationUserId);
        }
    }
}
