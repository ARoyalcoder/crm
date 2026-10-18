package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.OrdersSummary;
import com.pawanputra.bos.analytics.AnalyticsModels.SalesDashboard;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.SalesMetrics;
import com.pawanputra.bos.analytics.internal.Window;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The sales dashboard: leads and how far they got, the open pipeline, deals won, quotations and orders.
 * All figures are computed on request from the records themselves; nothing is stored here.
 */
@Service
@Transactional(readOnly = true)
public class SalesAnalyticsService {

    /** Invoiced total of one month, for the year-at-a-glance chart. */
    public record MonthRevenue(int year, int month, BigDecimal revenue) {
    }

    private final SalesMetrics metrics;
    private final BusinessCalendar calendar;
    private final JdbcTemplate jdbc;

    SalesAnalyticsService(SalesMetrics metrics, BusinessCalendar calendar, JdbcTemplate jdbc) {
        this.metrics = metrics;
        this.calendar = calendar;
        this.jdbc = jdbc;
    }

    /**
     * @param leads         the caller may see leads (LEAD_VIEW)
     * @param opportunities the caller may see opportunities (OPPORTUNITY_VIEW)
     * @param quotations    the caller may see quotations (QUOTATION_VIEW)
     * @param orders        the caller may see orders (ORDER_VIEW)
     */
    public SalesDashboard dashboard(UUID org, LocalDate from, LocalDate to, boolean leads, boolean opportunities, boolean quotations, boolean orders) {
        Window window = calendar.window(from, to);
        OrdersSummary orderSummary = null;
        if (orders) {
            Object[] totals = metrics.orders(org, window);
            long count = (Long) totals[0];
            BigDecimal value = (BigDecimal) totals[1];
            BigDecimal average = count == 0 ? null : value.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            orderSummary = new OrdersSummary(count, value, average, metrics.topSalespeople(org, window, 8), metrics.ordersTrend(org, window));
        }
        return new SalesDashboard(
                calendar.period(window),
                metrics.overview(org, window, leads, opportunities),
                opportunities ? metrics.wonByVertical(org, window) : null,
                quotations ? metrics.quotations(org, window) : null,
                orderSummary);
    }

    /** Invoiced total per month of a calendar year (same definition as everywhere else: issued, not cancelled). */
    public List<MonthRevenue> getSalesByPeriod(UUID orgId, int year) {
        return jdbc.query(
                "SELECT extract(year FROM issue_date)::int AS yr, extract(month FROM issue_date)::int AS mo, coalesce(sum(total), 0) AS revenue "
                        + "FROM invoices WHERE organization_id = ? AND status IN ('PAID', 'PARTIALLY_PAID', 'ISSUED') "
                        + "AND deleted_at IS NULL AND extract(year FROM issue_date) = ? GROUP BY yr, mo ORDER BY yr, mo",
                (row, i) -> new MonthRevenue(row.getInt("yr"), row.getInt("mo"), row.getBigDecimal("revenue")),
                orgId, year);
    }
}
