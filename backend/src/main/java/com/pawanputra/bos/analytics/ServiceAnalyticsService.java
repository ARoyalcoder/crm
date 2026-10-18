package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.ServiceDashboard;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.ServiceMetrics;
import com.pawanputra.bos.analytics.internal.Window;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The service dashboard: ticket volume and SLA performance, who is carrying the open load, and AMC renewals. */
@Service
@Transactional(readOnly = true)
public class ServiceAnalyticsService {

    private final ServiceMetrics metrics;
    private final BusinessCalendar calendar;

    ServiceAnalyticsService(ServiceMetrics metrics, BusinessCalendar calendar) {
        this.metrics = metrics;
        this.calendar = calendar;
    }

    /**
     * @param tickets the caller may see tickets (TICKET_VIEW)
     * @param amc     the caller may see AMC contracts and warranties (AMC_VIEW / WARRANTY_VIEW)
     */
    public ServiceDashboard dashboard(UUID org, LocalDate from, LocalDate to, boolean tickets, boolean amc) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        return new ServiceDashboard(
                calendar.period(window),
                metrics.overview(org, window, today, tickets, amc),
                tickets ? metrics.openByPriority(org, today, window) : null,
                tickets ? metrics.agentLoad(org, today, window) : null,
                amc ? metrics.warrantiesExpiring(org, today) : null);
    }
}
