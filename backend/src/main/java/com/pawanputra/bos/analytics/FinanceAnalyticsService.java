package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.FinanceDashboard;
import com.pawanputra.bos.analytics.AnalyticsModels.FinanceOverview;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.FinanceMetrics;
import com.pawanputra.bos.analytics.internal.Window;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The finance dashboard: what was invoiced and collected, what is owed and for how long, who owes it,
 * and what recorded project costs say about the projects completed in the period.
 *
 * <p>Earlier versions of this endpoint reported "expenses", "gross profit" and "net profit". The system
 * has no expense ledger, so those figures were not real (expenses were always zero and the "expense
 * categories" were really revenue and receivables). They are gone; project economics, built from the cost
 * columns of the projects themselves, is the honest replacement and says so.
 */
@Service
@Transactional(readOnly = true)
public class FinanceAnalyticsService {

    private final FinanceMetrics metrics;
    private final BusinessCalendar calendar;

    FinanceAnalyticsService(FinanceMetrics metrics, BusinessCalendar calendar) {
        this.metrics = metrics;
        this.calendar = calendar;
    }

    public FinanceDashboard dashboard(UUID org, LocalDate from, LocalDate to) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        FinanceOverview overview = metrics.overview(org, window, today);

        BigDecimal dso = overview.invoiced().value().signum() > 0
                ? overview.outstanding().amount().multiply(BigDecimal.valueOf(window.days()))
                        .divide(overview.invoiced().value(), 0, RoundingMode.HALF_UP)
                : null;

        return new FinanceDashboard(
                calendar.period(window),
                overview,
                dso,
                metrics.topDebtors(org, today, 6),
                metrics.collectedByMethod(org, window),
                metrics.projectEconomics(org, window));
    }
}
