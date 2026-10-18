package com.pawanputra.bos.analytics;

import com.pawanputra.bos.analytics.AnalyticsModels.ControlTower;
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
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The business control tower: one response that carries the headline figures of every part of the business,
 * each part only when the caller may see it. Holding ANALYTICS_VIEW opens the dashboard; the money, the
 * pipeline, the projects and the support desk each additionally need the permission of that module, so a
 * sales manager gets the sales picture without the finance numbers and a project manager the reverse.
 */
@Service
@Transactional(readOnly = true)
public class ControlTowerService {

    private final FinanceMetrics finance;
    private final SalesMetrics sales;
    private final ProjectMetrics projects;
    private final ServiceMetrics service;
    private final BusinessCalendar calendar;

    ControlTowerService(FinanceMetrics finance, SalesMetrics sales, ProjectMetrics projects, ServiceMetrics service, BusinessCalendar calendar) {
        this.finance = finance;
        this.sales = sales;
        this.projects = projects;
        this.service = service;
        this.calendar = calendar;
    }

    public ControlTower controlTower(CurrentUser user, LocalDate from, LocalDate to) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        var org = user.organizationId();

        FinanceOverview f = user.hasPermission(Permissions.FINANCE_VIEW) ? finance.overview(org, window, today) : null;

        boolean leads = user.hasPermission(Permissions.LEAD_VIEW);
        boolean opportunities = user.hasPermission(Permissions.OPPORTUNITY_VIEW);
        SalesOverview s = leads || opportunities ? sales.overview(org, window, leads, opportunities) : null;

        ProjectsOverview p = user.hasPermission(Permissions.PROJECT_VIEW) ? projects.overview(org, window, today) : null;

        boolean tickets = user.hasPermission(Permissions.TICKET_VIEW);
        boolean amc = user.hasPermission(Permissions.AMC_VIEW);
        ServiceOverview t = tickets || amc ? service.overview(org, window, today, tickets, amc) : null;

        return new ControlTower(calendar.period(window), f, s, p, t);
    }
}
