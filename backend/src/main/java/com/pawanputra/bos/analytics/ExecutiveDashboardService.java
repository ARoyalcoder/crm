package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.FinanceOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectsOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.SalesOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.ServiceOverview;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.FinanceMetrics;
import com.pawanputra.bos.analytics.internal.ProjectMetrics;
import com.pawanputra.bos.analytics.internal.SalesMetrics;
import com.pawanputra.bos.analytics.internal.ServiceMetrics;
import com.pawanputra.bos.analytics.internal.Window;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The original executive KPI response, kept so existing clients keep working. It is superseded by the
 * control tower ({@link ControlTowerService}), which adds comparisons, ageing, funnels and permission-scoped
 * sections. "Revenue" here now means the same thing as everywhere else: invoiced in the period.
 */
@Service
@Transactional(readOnly = true)
public class ExecutiveDashboardService {

    /** @deprecated use the control tower ({@code GET /analytics/control-tower}). */
    @Deprecated
    public record ExecutiveDashboard(
            BigDecimal revenue,
            BigDecimal pipelineValue,
            long activeProjects,
            long openTickets,
            BigDecimal collectionRate,
            BigDecimal totalReceivable,
            BigDecimal collectedThisPeriod,
            List<MonthAmount> revenueTrend) {
    }

    public record MonthAmount(int year, int month, BigDecimal amount) {
    }

    private final FinanceMetrics finance;
    private final SalesMetrics sales;
    private final ProjectMetrics projects;
    private final ServiceMetrics service;
    private final BusinessCalendar calendar;

    ExecutiveDashboardService(FinanceMetrics finance, SalesMetrics sales, ProjectMetrics projects, ServiceMetrics service, BusinessCalendar calendar) {
        this.finance = finance;
        this.sales = sales;
        this.projects = projects;
        this.service = service;
        this.calendar = calendar;
    }

    @SuppressWarnings("deprecation")
    public ExecutiveDashboard getDashboard(UUID org, LocalDate from, LocalDate to) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        FinanceOverview f = finance.overview(org, window, today);
        SalesOverview s = sales.overview(org, window, false, true);
        ProjectsOverview p = projects.overview(org, window, today);
        ServiceOverview t = service.overview(org, window, today, true, false);
        List<MonthAmount> trend = f.trend().stream()
                .map(point -> new MonthAmount(point.bucket().getYear(), point.bucket().getMonthValue(), point.invoiced()))
                .toList();
        return new ExecutiveDashboard(f.invoiced().value(), s.pipeline().amount(), p.active(), t.openTickets(),
                f.collectionRatePct(), f.outstanding().amount(), f.collected().value(), trend);
    }
}
