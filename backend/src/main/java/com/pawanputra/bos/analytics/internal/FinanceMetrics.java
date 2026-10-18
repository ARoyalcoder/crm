package com.pawanputra.bos.analytics.internal;

import static com.pawanputra.bos.analytics.internal.Sql.money;

import com.pawanputra.bos.analytics.AnalyticsModels.AgeingBand;
import com.pawanputra.bos.analytics.AnalyticsModels.Compared;
import com.pawanputra.bos.analytics.AnalyticsModels.DebtorRow;
import com.pawanputra.bos.analytics.AnalyticsModels.FinanceOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.MethodShare;
import com.pawanputra.bos.analytics.AnalyticsModels.Open;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectEconomics;
import com.pawanputra.bos.analytics.AnalyticsModels.TrendPoint;
import com.pawanputra.bos.analytics.AnalyticsModels.VerticalMargin;
import com.pawanputra.bos.analytics.AnalyticsModels.VerticalShare;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Money figures, read straight from invoices and payments with the SAME definitions the finance module
 * uses (see {@code FinanceReportService} and docs/finance.md), so a number on a dashboard can be
 * traced to the finance screens:
 *
 * <ul>
 *   <li><b>Invoiced</b>: total of invoices that were issued and not cancelled, by issue date.</li>
 *   <li><b>Collected</b>: payments received (reversed ones left out), by the date received.</li>
 *   <li><b>Outstanding</b>: total + debit notes - credit notes - paid, of issued invoices still open.</li>
 *   <li><b>Overdue</b>: the part of outstanding whose due date is before today (an invoice due today is not overdue).</li>
 * </ul>
 */
@Component
public class FinanceMetrics {

    private static final String OUTSTANDING = "(i.total + i.debit_total - i.credit_total - i.amount_paid)";
    private static final String OPEN = "i.organization_id = :org AND i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.deleted_at IS NULL";
    private static final String ISSUED = "i.organization_id = :org AND i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID') AND i.deleted_at IS NULL";

    /** What a project really cost: the itemised costs if any were entered, otherwise its single cost figure (as the project module does). */
    static final String PROJECT_COST = "(CASE WHEN coalesce(p.material_cost, 0) + coalesce(p.labour_cost, 0) + coalesce(p.vendor_cost, 0) + coalesce(p.travel_cost, 0) + coalesce(p.other_expenses, 0) > 0 "
            + "THEN coalesce(p.material_cost, 0) + coalesce(p.labour_cost, 0) + coalesce(p.vendor_cost, 0) + coalesce(p.travel_cost, 0) + coalesce(p.other_expenses, 0) "
            + "ELSE coalesce(p.cost, 0) END)";

    private final NamedParameterJdbcTemplate jdbc;
    private final BusinessCalendar calendar;

    FinanceMetrics(NamedParameterJdbcTemplate jdbc, BusinessCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    public BigDecimal invoiced(UUID org, LocalDate from, LocalDate to) {
        return money(jdbc.queryForObject(
                "SELECT coalesce(sum(i.total), 0) FROM invoices i WHERE " + ISSUED + " AND i.issue_date BETWEEN :from AND :to",
                new MapSqlParameterSource("org", org).addValue("from", from).addValue("to", to), BigDecimal.class));
    }

    public BigDecimal collected(UUID org, LocalDate from, LocalDate to) {
        return money(jdbc.queryForObject(
                "SELECT coalesce(sum(amount), 0) FROM payments WHERE organization_id = :org AND status = 'RECEIVED' AND received_on BETWEEN :from AND :to",
                new MapSqlParameterSource("org", org).addValue("from", from).addValue("to", to), BigDecimal.class));
    }

    /** All open invoices as of today (outstanding) and the overdue part of them, in one pass. */
    public Open[] outstandingAndOverdue(UUID org, LocalDate today) {
        return jdbc.queryForObject(
                "SELECT coalesce(sum(" + OUTSTANDING + "), 0), count(*), "
                        + "coalesce(sum(" + OUTSTANDING + ") FILTER (WHERE i.due_date < :today), 0), count(*) FILTER (WHERE i.due_date < :today) "
                        + "FROM invoices i WHERE " + OPEN,
                new MapSqlParameterSource("org", org).addValue("today", today),
                (rs, n) -> new Open[] {
                    new Open(money(rs.getBigDecimal(1)), rs.getLong(2)),
                    new Open(money(rs.getBigDecimal(3)), rs.getLong(4))});
    }

    /** What is owed, by how long it has been due. Every band is present, empty ones with zero. */
    public List<AgeingBand> ageing(UUID org, LocalDate today) {
        List<Integer> bounds = calendar.ageingBounds();
        StringBuilder band = new StringBuilder("CASE WHEN i.due_date >= :today THEN 0");
        for (int k = 0; k < bounds.size(); k++) {
            band.append(" WHEN :today - i.due_date <= ").append(bounds.get(k)).append(" THEN ").append(k + 1);
        }
        band.append(" ELSE ").append(bounds.size() + 1).append(" END");

        Map<Integer, Open> found = new HashMap<>();
        jdbc.query("SELECT " + band + " AS band, coalesce(sum(" + OUTSTANDING + "), 0), count(*) FROM invoices i WHERE " + OPEN + " GROUP BY 1",
                new MapSqlParameterSource("org", org).addValue("today", today),
                rs -> {
                    found.put(rs.getInt(1), new Open(money(rs.getBigDecimal(2)), rs.getLong(3)));
                });

        List<AgeingBand> result = new ArrayList<>();
        result.add(band("NOT_DUE", "Not yet due", found.get(0)));
        int low = 1;
        for (int k = 0; k < bounds.size(); k++) {
            int high = bounds.get(k);
            result.add(band("D" + low + "_" + high, low + "–" + high + " days", found.get(k + 1)));
            low = high + 1;
        }
        result.add(band("D" + low + "_PLUS", "Over " + (low - 1) + " days", found.get(bounds.size() + 1)));
        return result;
    }

    private static AgeingBand band(String key, String label, Open open) {
        return new AgeingBand(key, label, open == null ? BigDecimal.ZERO.setScale(2) : open.amount(), open == null ? 0 : open.invoices());
    }

    /** Invoiced and collected per day, week or month (see {@link Window#granularity()}), with empty buckets filled in. */
    public List<TrendPoint> trend(UUID org, Window window) {
        String unit = window.granularity().truncUnit();
        String step = window.granularity().step();
        String sql = "WITH buckets AS ("
                + "  SELECT g::date AS bucket FROM generate_series(date_trunc('" + unit + "', CAST(:from AS timestamp)), CAST(:to AS timestamp), interval '" + step + "') g), "
                + "inv AS ("
                + "  SELECT date_trunc('" + unit + "', CAST(i.issue_date AS timestamp))::date AS bucket, sum(i.total) AS amount FROM invoices i "
                + "  WHERE " + ISSUED + " AND i.issue_date BETWEEN :from AND :to GROUP BY 1), "
                + "pay AS ("
                + "  SELECT date_trunc('" + unit + "', CAST(received_on AS timestamp))::date AS bucket, sum(amount) AS amount FROM payments "
                + "  WHERE organization_id = :org AND status = 'RECEIVED' AND received_on BETWEEN :from AND :to GROUP BY 1) "
                + "SELECT b.bucket, coalesce(inv.amount, 0), coalesce(pay.amount, 0) FROM buckets b "
                + "LEFT JOIN inv ON inv.bucket = b.bucket LEFT JOIN pay ON pay.bucket = b.bucket ORDER BY b.bucket";
        return jdbc.query(sql, new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to()),
                (rs, n) -> new TrendPoint(rs.getObject(1, LocalDate.class), money(rs.getBigDecimal(2)), money(rs.getBigDecimal(3))));
    }

    /**
     * Invoiced amount of each service vertical, from the invoice lines' catalog service. Every active vertical is
     * listed (so a vertical keeps its place and colour on every chart); lines not linked to a service come last.
     */
    public List<VerticalShare> invoicedByVertical(UUID org, Window window) {
        String sql = "WITH lines AS ("
                + "  SELECT v.code AS code, sum(ii.line_total) AS amount FROM invoice_items ii "
                + "  JOIN invoices i ON i.id = ii.invoice_id "
                + "  LEFT JOIN services s ON s.id = ii.service_id LEFT JOIN service_categories c ON c.id = s.category_id LEFT JOIN service_verticals v ON v.id = c.vertical_id "
                + "  WHERE " + ISSUED + " AND i.issue_date BETWEEN :from AND :to GROUP BY v.code) "
                + "SELECT v.code, v.name, coalesce(l.amount, 0), v.display_order FROM service_verticals v LEFT JOIN lines l ON l.code = v.code WHERE v.active "
                + "UNION ALL SELECT NULL, 'Not linked to a service', l.amount, 1000 FROM lines l WHERE l.code IS NULL AND l.amount > 0 "
                + "ORDER BY 4";
        return jdbc.query(sql, new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to()),
                (rs, n) -> new VerticalShare(rs.getString(1), rs.getString(2), money(rs.getBigDecimal(3))));
    }

    public List<DebtorRow> topDebtors(UUID org, LocalDate today, int limit) {
        String sql = "SELECT i.customer_id, max(i.customer_name), sum(" + OUTSTANDING + ") AS outstanding, "
                + "coalesce(sum(" + OUTSTANDING + ") FILTER (WHERE i.due_date < :today), 0), count(*), "
                + "max(:today - i.due_date) FILTER (WHERE i.due_date < :today) "
                + "FROM invoices i WHERE " + OPEN + " GROUP BY i.customer_id ORDER BY outstanding DESC LIMIT :limit";
        return jdbc.query(sql, new MapSqlParameterSource("org", org).addValue("today", today).addValue("limit", limit),
                (rs, n) -> new DebtorRow(rs.getObject(1, UUID.class), rs.getString(2), money(rs.getBigDecimal(3)), money(rs.getBigDecimal(4)),
                        rs.getLong(5), (Integer) rs.getObject(6)));
    }

    public List<MethodShare> collectedByMethod(UUID org, Window window) {
        return jdbc.query(
                "SELECT method_name, sum(amount), count(*) FROM payments WHERE organization_id = :org AND status = 'RECEIVED' AND received_on BETWEEN :from AND :to "
                        + "GROUP BY method_name ORDER BY 2 DESC",
                new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to()),
                (rs, n) -> new MethodShare(rs.getString(1), money(rs.getBigDecimal(2)), rs.getLong(3)));
    }

    /** Revenue against recorded cost of the projects completed in the period, in total and per vertical. */
    public ProjectEconomics projectEconomics(UUID org, Window window) {
        String sql = "SELECT v.code, v.name, count(*), coalesce(sum(p.revenue), 0), coalesce(sum(" + PROJECT_COST + "), 0), "
                + "coalesce(sum(p.material_cost), 0), coalesce(sum(p.labour_cost), 0), coalesce(sum(p.vendor_cost), 0), coalesce(sum(p.travel_cost), 0), coalesce(sum(p.other_expenses), 0) "
                + "FROM projects p " + ProjectSql.JOIN_STATUS + "LEFT JOIN services s ON s.id = p.service_id LEFT JOIN service_categories c ON c.id = s.category_id LEFT JOIN service_verticals v ON v.id = c.vertical_id "
                + "WHERE p.organization_id = :org AND p.deleted_at IS NULL AND p.actual_completion_date BETWEEN :from AND :to "
                + "AND " + ProjectSql.DONE + " "
                + "GROUP BY v.code, v.name ORDER BY coalesce(sum(p.revenue), 0) DESC";
        List<VerticalMargin> rows = new ArrayList<>();
        BigDecimal[] totals = new BigDecimal[7]; // revenue, cost, material, labour, vendor, travel, other
        for (int k = 0; k < totals.length; k++) {
            totals[k] = BigDecimal.ZERO;
        }
        long[] projects = {0};
        jdbc.query(sql, new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to()), rs -> {
            BigDecimal revenue = money(rs.getBigDecimal(4));
            BigDecimal cost = money(rs.getBigDecimal(5));
            rows.add(new VerticalMargin(rs.getString(1), rs.getString(2) == null ? "Not linked to a service" : rs.getString(2), rs.getLong(3), revenue, cost, marginPct(revenue, cost)));
            projects[0] += rs.getLong(3);
            totals[0] = totals[0].add(revenue);
            totals[1] = totals[1].add(cost);
            for (int k = 0; k < 5; k++) {
                totals[2 + k] = totals[2 + k].add(money(rs.getBigDecimal(6 + k)));
            }
        });
        BigDecimal itemised = totals[2].add(totals[3]).add(totals[4]).add(totals[5]).add(totals[6]);
        return new ProjectEconomics(projects[0], totals[0], totals[1], totals[0].subtract(totals[1]), marginPct(totals[0], totals[1]),
                totals[2], totals[3], totals[4], totals[5], totals[6], totals[1].subtract(itemised), rows);
    }

    /** (revenue - cost) / revenue as a percentage; null when there is no revenue to compare with. */
    static BigDecimal marginPct(BigDecimal revenue, BigDecimal cost) {
        if (revenue == null || revenue.signum() <= 0) {
            return null;
        }
        return revenue.subtract(cost).multiply(BigDecimal.valueOf(100)).divide(revenue, 1, RoundingMode.HALF_UP);
    }

    /** Everything the control tower and the finance dashboard share, for one period. */
    public FinanceOverview overview(UUID org, Window window, LocalDate today) {
        Window previous = window.previous();
        BigDecimal invoiced = invoiced(org, window.from(), window.to());
        BigDecimal collected = collected(org, window.from(), window.to());
        Open[] open = outstandingAndOverdue(org, today);
        BigDecimal rate = invoiced.signum() > 0 ? collected.multiply(BigDecimal.valueOf(100)).divide(invoiced, 1, RoundingMode.HALF_UP) : null;
        return new FinanceOverview(
                new Compared(invoiced, invoiced(org, previous.from(), previous.to())),
                new Compared(collected, collected(org, previous.from(), previous.to())),
                open[0], open[1], rate,
                trend(org, window), ageing(org, today), invoicedByVertical(org, window));
    }
}
