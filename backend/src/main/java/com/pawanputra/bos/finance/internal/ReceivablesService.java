package com.pawanputra.bos.finance.internal;

import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.web.PageResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Receivables management: dashboard figures, outstanding and overdue invoice lists, ageing report,
 * collection tasks and org-level configuration.
 */
@Service
@Transactional(readOnly = true)
public class ReceivablesService {

    private static final String OUTSTANDING_EXPR = "(total + debit_total - credit_total - amount_paid)";
    private static final String OPEN_WHERE = "organization_id = ? AND status IN ('ISSUED', 'PARTIALLY_PAID') AND deleted_at IS NULL";

    private final JdbcTemplate jdbc;
    private final FinanceContext context;
    private final CollectionTaskRepository collectionTaskRepository;
    private final ReceivablesConfigRepository receivablesConfigRepository;

    ReceivablesService(JdbcTemplate jdbc, FinanceContext context,
            CollectionTaskRepository collectionTaskRepository,
            ReceivablesConfigRepository receivablesConfigRepository) {
        this.jdbc = jdbc;
        this.context = context;
        this.collectionTaskRepository = collectionTaskRepository;
        this.receivablesConfigRepository = receivablesConfigRepository;
    }

    // ------------------------------------------------------------------ response types

    /** One ageing bucket on the dashboard. */
    public record AgeingBucket(String label, int fromDays, Integer toDays, long count, BigDecimal amount) {
    }

    /** The receivables dashboard: headline KPIs and ageing buckets. */
    public record Dashboard(
            BigDecimal totalReceivable, BigDecimal overdue, BigDecimal dueToday, BigDecimal dueThisWeek,
            BigDecimal collectionRate, List<AgeingBucket> ageingBuckets) {
    }

    /** An outstanding invoice as seen from the receivables view. */
    public record InvoiceRow(
            UUID id, String invoiceNumber, UUID customerId, String customerName,
            LocalDate dueDate, BigDecimal outstanding, String status, long daysOverdue) {
    }

    /** A collection task with its invoice and customer context. */
    public record TaskRow(
            UUID id, UUID organizationId, UUID invoiceId, String invoiceNumber,
            UUID customerId, String customerName, UUID assignedToUserId,
            CollectionTask.Priority priority, CollectionTask.Status status,
            LocalDate dueDate, String notes, Instant completedAt,
            Instant createdAt, Instant updatedAt) {
    }

    /** Receivables configuration for an organization. */
    public record Config(
            UUID id, int overdueDays1, int overdueDays2,
            boolean collectionTaskEnabled, boolean escalationEnabled,
            UUID escalationUserId) {
    }

    // ------------------------------------------------------------------ input types

    public record CreateTaskInput(
            UUID invoiceId, CollectionTask.Priority priority,
            UUID assignedToUserId, LocalDate dueDate, String notes) {
    }

    public record UpdateTaskInput(
            CollectionTask.Priority priority, CollectionTask.Status status,
            UUID assignedToUserId, LocalDate dueDate, String notes) {
    }

    public record UpdateConfigInput(
            int overdueDays1, int overdueDays2,
            boolean collectionTaskEnabled, boolean escalationEnabled,
            UUID escalationUserId) {
    }

    // ------------------------------------------------------------------ dashboard

    public Dashboard getDashboard(UUID organizationId) {
        LocalDate today = context.today();
        Date day = Date.valueOf(today);
        Date weekEnd = Date.valueOf(today.plusDays(7));
        Date monthStart = Date.valueOf(today.withDayOfMonth(1));
        Date nextMonth = Date.valueOf(today.withDayOfMonth(1).plusMonths(1));

        // Single query for all headline figures
        BigDecimal[] figures = jdbc.queryForObject("""
                SELECT
                  (SELECT coalesce(sum(%1$s), 0) FROM invoices WHERE %2$s),
                  (SELECT coalesce(sum(%1$s), 0) FROM invoices WHERE %2$s AND due_date < ?),
                  (SELECT coalesce(sum(%1$s), 0) FROM invoices WHERE %2$s AND due_date = ?),
                  (SELECT coalesce(sum(%1$s), 0) FROM invoices WHERE %2$s AND due_date > ? AND due_date <= ?),
                  (SELECT coalesce(sum(amount), 0)  FROM payments WHERE organization_id = ? AND status = 'RECEIVED'
                     AND received_on >= ? AND received_on < ?),
                  (SELECT coalesce(sum(total), 0) FROM invoices WHERE organization_id = ? AND status NOT IN ('DRAFT', 'CANCELLED')
                     AND deleted_at IS NULL AND issue_date >= ? AND issue_date < ?)
                """.formatted(OUTSTANDING_EXPR, OPEN_WHERE),
                (row, index) -> new BigDecimal[]{
                        Money.of(row.getBigDecimal(1)), Money.of(row.getBigDecimal(2)),
                        Money.of(row.getBigDecimal(3)), Money.of(row.getBigDecimal(4)),
                        Money.of(row.getBigDecimal(5)), Money.of(row.getBigDecimal(6))
                },
                organizationId,
                organizationId, day,
                organizationId, day,
                organizationId, day, weekEnd,
                organizationId, monthStart, nextMonth,
                organizationId, monthStart, nextMonth);

        BigDecimal invoicedThisMonth = figures[5];
        BigDecimal collectionRate = invoicedThisMonth.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : figures[4].multiply(BigDecimal.valueOf(100))
                        .divide(invoicedThisMonth, 2, RoundingMode.HALF_UP);

        List<AgeingBucket> buckets = getAgeingBuckets(organizationId, today, day);

        return new Dashboard(figures[0], figures[1], figures[2], figures[3], collectionRate, buckets);
    }

    private List<AgeingBucket> getAgeingBuckets(UUID organizationId, LocalDate today, Date day) {
        // Fixed buckets: 0-30 / 31-60 / 61-90 / 90+ days overdue (past due only)
        return jdbc.query("""
                SELECT
                  bucket,
                  count(*) as cnt,
                  coalesce(sum(outstanding), 0) as amt
                FROM (
                  SELECT
                    %s AS outstanding,
                    CASE
                      WHEN (CAST(? AS date) - due_date) <= 30 THEN '0-30'
                      WHEN (CAST(? AS date) - due_date) <= 60 THEN '31-60'
                      WHEN (CAST(? AS date) - due_date) <= 90 THEN '61-90'
                      ELSE '90+'
                    END as bucket
                  FROM invoices
                  WHERE %s AND due_date < ? AND deleted_at IS NULL
                ) sub
                GROUP BY bucket
                ORDER BY
                  CASE bucket WHEN '0-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61-90' THEN 3 ELSE 4 END
                """.formatted(OUTSTANDING_EXPR, OPEN_WHERE),
                (row, index) -> {
                    String label = row.getString("bucket");
                    long cnt = row.getLong("cnt");
                    BigDecimal amt = Money.of(row.getBigDecimal("amt"));
                    return switch (label) {
                        case "0-30" -> new AgeingBucket("0–30 days", 0, 30, cnt, amt);
                        case "31-60" -> new AgeingBucket("31–60 days", 31, 60, cnt, amt);
                        case "61-90" -> new AgeingBucket("61–90 days", 61, 90, cnt, amt);
                        default -> new AgeingBucket("Over 90 days", 91, null, cnt, amt);
                    };
                },
                day, day, day, organizationId, day);
    }

    // ------------------------------------------------------------------ invoice lists

    /** ISSUED and PARTIALLY_PAID invoices, sorted by due date ascending (soonest first). */
    public PageResponse<InvoiceRow> getOutstandingInvoices(UUID organizationId, int page, int size) {
        LocalDate today = context.today();
        Date day = Date.valueOf(today);
        String sql = """
                SELECT id, invoice_number, customer_id, customer_name, due_date,
                       %s as outstanding, status,
                       GREATEST(0, (CAST(? AS date) - due_date))::bigint as days_overdue
                FROM invoices
                WHERE %s
                ORDER BY due_date ASC NULLS LAST, id
                LIMIT ? OFFSET ?
                """.formatted(OUTSTANDING_EXPR, OPEN_WHERE);

        String countSql = "SELECT count(*) FROM invoices WHERE " + OPEN_WHERE;
        long total = jdbc.queryForObject(countSql, Long.class, organizationId);

        // Parameter order matches the SQL: 1) day for EXTRACT, 2) orgId for WHERE, 3) LIMIT, 4) OFFSET
        List<InvoiceRow> rows = jdbc.query(sql,
                (row, idx) -> new InvoiceRow(
                        row.getObject("id", UUID.class),
                        row.getString("invoice_number"),
                        row.getObject("customer_id", UUID.class),
                        row.getString("customer_name"),
                        row.getObject("due_date", LocalDate.class),
                        Money.of(row.getBigDecimal("outstanding")),
                        statusLabel(row.getString("status"), row.getObject("due_date", LocalDate.class), today),
                        row.getLong("days_overdue")),
                day, organizationId, size, (long) page * size);

        return new PageResponse<>(rows, page, size, total, totalPages(total, size));
    }

    /** ISSUED and PARTIALLY_PAID invoices past their due date, sorted by due date ascending. */
    public PageResponse<InvoiceRow> getOverdueInvoices(UUID organizationId, int page, int size) {
        LocalDate today = context.today();
        Date day = Date.valueOf(today);
        String overdue = OPEN_WHERE + " AND due_date < ?";

        String sql = """
                SELECT id, invoice_number, customer_id, customer_name, due_date,
                       %s as outstanding, status,
                       (CAST(? AS date) - due_date)::bigint as days_overdue
                FROM invoices
                WHERE %s
                ORDER BY due_date ASC, id
                LIMIT ? OFFSET ?
                """.formatted(OUTSTANDING_EXPR, overdue);

        String countSql = "SELECT count(*) FROM invoices WHERE " + overdue;
        long total = jdbc.queryForObject(countSql, Long.class, organizationId, day);

        // Parameter order: 1) day for EXTRACT, 2) orgId for WHERE, 3) day for due_date < ?, 4) LIMIT, 5) OFFSET
        List<InvoiceRow> rows = jdbc.query(sql,
                (row, idx) -> new InvoiceRow(
                        row.getObject("id", UUID.class),
                        row.getString("invoice_number"),
                        row.getObject("customer_id", UUID.class),
                        row.getString("customer_name"),
                        row.getObject("due_date", LocalDate.class),
                        Money.of(row.getBigDecimal("outstanding")),
                        "OVERDUE",
                        row.getLong("days_overdue")),
                day, organizationId, day, size, (long) page * size);

        return new PageResponse<>(rows, page, size, total, totalPages(total, size));
    }

    /** Full ageing breakdown by customer — delegates to the shared Ageing utility. */
    public Ageing.Report getAgeingReport(UUID organizationId) {
        List<Ageing.Item> open = jdbc.query(
                "SELECT customer_id, customer_name, due_date, " + OUTSTANDING_EXPR + " FROM invoices WHERE " + OPEN_WHERE,
                (row, idx) -> new Ageing.Item(row.getObject(1, UUID.class), row.getString(2),
                        row.getObject(3, LocalDate.class), row.getBigDecimal(4)),
                organizationId);
        return Ageing.report(context.today(), context.properties().ageingBucketDays(), open);
    }

    // ------------------------------------------------------------------ collection tasks

    public PageResponse<TaskRow> getCollectionTasks(UUID organizationId, CollectionTask.Status statusFilter,
            int page, int size) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        Page<CollectionTask> result = statusFilter != null
                ? collectionTaskRepository.findAllByOrganizationIdAndStatus(
                        organizationId, statusFilter, PageRequest.of(page, size, sort))
                : collectionTaskRepository.findAllByOrganizationId(
                        organizationId, PageRequest.of(page, size, sort));
        return PageResponse.from(result, this::toTaskRow);
    }

    @Transactional
    public TaskRow createCollectionTask(CreateTaskInput input, UUID organizationId) {
        // Look up the invoice to get the customer id
        List<UUID> customerIds = jdbc.query(
                "SELECT customer_id FROM invoices WHERE id = ? AND organization_id = ? AND deleted_at IS NULL",
                (row, idx) -> row.getObject("customer_id", UUID.class),
                input.invoiceId(), organizationId);
        if (customerIds.isEmpty()) {
            throw new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Invoice not found");
        }
        UUID customerId = customerIds.get(0);

        CollectionTask task = new CollectionTask(organizationId, input.invoiceId(), customerId);
        if (input.priority() != null) {
            task.setPriority(input.priority());
        }
        task.setAssignedToUserId(input.assignedToUserId());
        task.setDueDate(input.dueDate());
        task.setNotes(input.notes());

        CollectionTask saved = collectionTaskRepository.save(task);
        return toTaskRow(saved);
    }

    @Transactional
    public TaskRow updateCollectionTask(UUID id, UpdateTaskInput input, UUID organizationId) {
        CollectionTask task = collectionTaskRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Collection task not found"));

        if (input.priority() != null) {
            task.setPriority(input.priority());
        }
        if (input.status() != null) {
            task.setStatus(input.status());
            if (input.status() == CollectionTask.Status.COMPLETED && task.getCompletedAt() == null) {
                task.setCompletedAt(context.now());
            }
        }
        task.setAssignedToUserId(input.assignedToUserId());
        task.setDueDate(input.dueDate());
        task.setNotes(input.notes());

        CollectionTask saved = collectionTaskRepository.save(task);
        return toTaskRow(saved);
    }

    public TaskRow getCollectionTask(UUID id, UUID organizationId) {
        return collectionTaskRepository.findByIdAndOrganizationId(id, organizationId)
                .map(this::toTaskRow)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Collection task not found"));
    }

    // ------------------------------------------------------------------ config

    /** Returns the saved config, or default values if no config row exists yet. */
    public Config getConfig(UUID organizationId) {
        return receivablesConfigRepository.findByOrganizationId(organizationId)
                .map(this::toConfig)
                .orElseGet(() -> {
                    // No row yet — return defaults without persisting
                    ReceivablesConfig defaults = new ReceivablesConfig(organizationId);
                    return toConfig(defaults);
                });
    }

    @Transactional
    public Config updateConfig(UUID organizationId, UpdateConfigInput input) {
        ReceivablesConfig config = receivablesConfigRepository.findByOrganizationId(organizationId)
                .orElseGet(() -> new ReceivablesConfig(organizationId));
        config.setOverdueDays1(input.overdueDays1());
        config.setOverdueDays2(input.overdueDays2());
        config.setCollectionTaskEnabled(input.collectionTaskEnabled());
        config.setEscalationEnabled(input.escalationEnabled());
        config.setEscalationUserId(input.escalationUserId());
        ReceivablesConfig saved = receivablesConfigRepository.save(config);
        return toConfig(saved);
    }

    // ------------------------------------------------------------------ helpers

    private TaskRow toTaskRow(CollectionTask task) {
        // Fetch the invoice number and customer name in a single query
        String[] invoiceMeta = jdbc.queryForObject(
                "SELECT invoice_number, customer_name FROM invoices WHERE id = ?",
                (row, idx) -> new String[]{row.getString("invoice_number"), row.getString("customer_name")},
                task.getInvoiceId());
        String invoiceNumber = invoiceMeta != null ? invoiceMeta[0] : null;
        String customerName = invoiceMeta != null ? invoiceMeta[1] : null;
        return new TaskRow(
                task.getId(), task.getOrganizationId(), task.getInvoiceId(), invoiceNumber,
                task.getCustomerId(), customerName, task.getAssignedToUserId(),
                task.getPriority(), task.getStatus(), task.getDueDate(), task.getNotes(),
                task.getCompletedAt(), task.getCreatedAt(), task.getUpdatedAt());
    }

    private Config toConfig(ReceivablesConfig config) {
        return new Config(config.getId(), config.getOverdueDays1(), config.getOverdueDays2(),
                config.isCollectionTaskEnabled(), config.isEscalationEnabled(),
                config.getEscalationUserId());
    }

    private static String statusLabel(String stored, LocalDate dueDate, LocalDate today) {
        if (("ISSUED".equals(stored) || "PARTIALLY_PAID".equals(stored))
                && dueDate != null && dueDate.isBefore(today)) {
            return "OVERDUE";
        }
        return stored;
    }

    private static int totalPages(long total, int size) {
        return size <= 0 ? 0 : (int) Math.ceil((double) total / size);
    }
}
