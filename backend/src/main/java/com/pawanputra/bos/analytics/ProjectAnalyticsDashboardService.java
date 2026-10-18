package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.ProjectsDashboard;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.FinanceMetrics;
import com.pawanputra.bos.analytics.internal.ProjectMetrics;
import com.pawanputra.bos.analytics.internal.Window;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The project dashboard: how many projects are running and late, how delivery went in the period, expected
 * against recorded cost, milestones coming due, and the margin of what was completed. The older
 * {@code ProjectAnalyticsService} (pipeline stages and delivery detail) is separate and unchanged.
 */
@Service
@Transactional(readOnly = true)
public class ProjectAnalyticsDashboardService {

    private final ProjectMetrics metrics;
    private final FinanceMetrics finance;
    private final BusinessCalendar calendar;

    ProjectAnalyticsDashboardService(ProjectMetrics metrics, FinanceMetrics finance, BusinessCalendar calendar) {
        this.metrics = metrics;
        this.finance = finance;
        this.calendar = calendar;
    }

    /** @param economics whether the caller may also see revenue and margin (FINANCE_VIEW); projects hold money figures. */
    public ProjectsDashboard dashboard(UUID org, LocalDate from, LocalDate to, boolean economics) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        BigDecimal[] totals = metrics.costTotals(org, window, today);
        return new ProjectsDashboard(
                calendar.period(window),
                metrics.overview(org, window, today),
                totals[0],
                totals[1],
                metrics.costComparison(org, window, today, 8),
                metrics.deliveryTrend(org, window, today),
                metrics.upcomingMilestones(org, today, 8),
                economics ? finance.projectEconomics(org, window) : null);
    }
}
