package com.pawanputra.bos.analytics.web;

import com.pawanputra.bos.analytics.AnalyticsModels.ControlTower;
import com.pawanputra.bos.analytics.AnalyticsModels.FinanceDashboard;
import com.pawanputra.bos.analytics.AnalyticsModels.MyWork;
import com.pawanputra.bos.analytics.AnalyticsModels.ProjectsDashboard;
import com.pawanputra.bos.analytics.AnalyticsModels.SalesDashboard;
import com.pawanputra.bos.analytics.AnalyticsModels.WorkforceDashboard;
import com.pawanputra.bos.analytics.AnalyticsModels.ServiceDashboard;
import com.pawanputra.bos.analytics.ControlTowerService;
import com.pawanputra.bos.analytics.ExecutiveDashboardService;
import com.pawanputra.bos.analytics.FinanceAnalyticsService;
import com.pawanputra.bos.analytics.MyWorkService;
import com.pawanputra.bos.analytics.ProjectAnalyticsDashboardService;
import com.pawanputra.bos.analytics.SalesAnalyticsService;
import com.pawanputra.bos.analytics.ServiceAnalyticsService;
import com.pawanputra.bos.analytics.WorkforceAnalyticsService;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboards. Opening any of them needs ANALYTICS_VIEW <em>and</em> the permission of the module the
 * figures come from (finance, projects, the support desk, ...), because the numbers on a dashboard are the
 * numbers of those modules: a role that may not open the invoices must not read their totals from here.
 * Every endpoint takes an optional {@code from} and {@code to} (calendar days, inclusive, in the business time
 * zone); without them the period is the last 30 days. "My work" is the exception: it is the caller's own
 * data, so it needs no permission of its own, and each block of it is still checked against the module it comes from.
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/analytics")
@Tag(name = "Analytics")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class AnalyticsController {

    private static final String ANALYTICS = "hasAuthority('" + Permissions.ANALYTICS_VIEW + "')";
    private static final String CAN_FINANCE = ANALYTICS + " and hasAuthority('" + Permissions.FINANCE_VIEW + "')";
    private static final String CAN_SALES = ANALYTICS + " and hasAnyAuthority('" + Permissions.LEAD_VIEW + "', '" + Permissions.OPPORTUNITY_VIEW + "')";
    private static final String CAN_PROJECTS = ANALYTICS + " and hasAuthority('" + Permissions.PROJECT_VIEW + "')";
    private static final String CAN_SERVICE = ANALYTICS + " and hasAnyAuthority('" + Permissions.TICKET_VIEW + "', '" + Permissions.AMC_VIEW + "')";
    private static final String CAN_WORKFORCE = ANALYTICS + " and hasAuthority('" + Permissions.WORKFORCE_VIEW + "')";
    private static final String CAN_EVERYTHING = CAN_FINANCE + " and hasAuthority('" + Permissions.OPPORTUNITY_VIEW + "') and hasAuthority('"
            + Permissions.PROJECT_VIEW + "') and hasAuthority('" + Permissions.TICKET_VIEW + "')";

    private final BusinessCalendar calendar;
    private final ControlTowerService controlTower;
    private final FinanceAnalyticsService finance;
    private final SalesAnalyticsService sales;
    private final ProjectAnalyticsDashboardService projects;
    private final ServiceAnalyticsService service;
    private final WorkforceAnalyticsService workforce;
    private final ExecutiveDashboardService executive;
    private final MyWorkService myWork;

    AnalyticsController(BusinessCalendar calendar, ControlTowerService controlTower, FinanceAnalyticsService finance, SalesAnalyticsService sales,
            ProjectAnalyticsDashboardService projects, ServiceAnalyticsService service, WorkforceAnalyticsService workforce,
            ExecutiveDashboardService executive, MyWorkService myWork) {
        this.calendar = calendar;
        this.controlTower = controlTower;
        this.finance = finance;
        this.sales = sales;
        this.projects = projects;
        this.service = service;
        this.workforce = workforce;
        this.executive = executive;
        this.myWork = myWork;
    }

    private LocalDate to(LocalDate to) {
        return to != null ? to : calendar.today();
    }

    private LocalDate from(LocalDate from, LocalDate to) {
        return from != null ? from : to(to).minusDays(29);
    }

    @GetMapping("/control-tower")
    @PreAuthorize("hasAuthority('" + Permissions.ANALYTICS_VIEW + "')")
    @Operation(summary = "Business control tower: headline figures of finance, sales, projects and service, each only if the caller may see that module. Requires ANALYTICS_VIEW.")
    public ControlTower controlTower(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return controlTower.controlTower(CurrentUser.require(), from(from, to), to(to));
    }

    @GetMapping("/finance")
    @PreAuthorize(CAN_FINANCE)
    @Operation(summary = "Finance dashboard: invoiced, collected, receivables ageing, debtors, project economics. Requires ANALYTICS_VIEW and FINANCE_VIEW.")
    public FinanceDashboard finance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return finance.dashboard(CurrentUser.require().organizationId(), from(from, to), to(to));
    }

    @GetMapping("/sales")
    @PreAuthorize(CAN_SALES)
    @Operation(summary = "Sales dashboard: lead funnel, pipeline, won deals, quotations, orders. Requires ANALYTICS_VIEW and LEAD_VIEW or OPPORTUNITY_VIEW; quotations need QUOTATION_VIEW and orders ORDER_VIEW.")
    public SalesDashboard sales(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        CurrentUser user = CurrentUser.require();
        return sales.dashboard(user.organizationId(), from(from, to), to(to),
                user.hasPermission(Permissions.LEAD_VIEW), user.hasPermission(Permissions.OPPORTUNITY_VIEW),
                user.hasPermission(Permissions.QUOTATION_VIEW), user.hasPermission(Permissions.ORDER_VIEW));
    }

    @GetMapping("/sales/by-period")
    @PreAuthorize(CAN_FINANCE)
    @Operation(summary = "Invoiced total per month of a calendar year. Requires ANALYTICS_VIEW and FINANCE_VIEW.")
    public List<SalesAnalyticsService.MonthRevenue> byPeriod(@RequestParam int year) {
        return sales.getSalesByPeriod(CurrentUser.require().organizationId(), year);
    }

    @GetMapping("/projects")
    @PreAuthorize(CAN_PROJECTS)
    @Operation(summary = "Project dashboard: delivery, delays, cost against estimate, milestones. Requires ANALYTICS_VIEW and PROJECT_VIEW.")
    public ProjectsDashboard projects(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        CurrentUser user = CurrentUser.require();
        return projects.dashboard(user.organizationId(), from(from, to), to(to), user.hasPermission(Permissions.FINANCE_VIEW));
    }

    @GetMapping("/service")
    @PreAuthorize(CAN_SERVICE)
    @Operation(summary = "Service dashboard: ticket volume, SLA performance, AMC renewals. Requires ANALYTICS_VIEW and TICKET_VIEW or AMC_VIEW.")
    public ServiceDashboard service(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        CurrentUser user = CurrentUser.require();
        return service.dashboard(user.organizationId(), from(from, to), to(to),
                user.hasPermission(Permissions.TICKET_VIEW), user.hasPermission(Permissions.AMC_VIEW));
    }

    @GetMapping("/workforce")
    @PreAuthorize(CAN_WORKFORCE)
    @Operation(summary = "Workforce dashboard: headcount, attendance, and (with COMMISSION_VIEW) top earners. Requires ANALYTICS_VIEW and WORKFORCE_VIEW.")
    public WorkforceDashboard workforce(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String department) {
        CurrentUser user = CurrentUser.require();
        return workforce.dashboard(user.organizationId(), from(from, to), to(to), department, user.hasPermission(Permissions.COMMISSION_VIEW));
    }

    @Deprecated
    @GetMapping("/executive")
    @PreAuthorize(CAN_EVERYTHING)
    @Operation(summary = "Deprecated: use /analytics/control-tower. Requires ANALYTICS_VIEW plus finance, opportunity, project and ticket access.", deprecated = true)
    @SuppressWarnings("deprecation")
    public ExecutiveDashboardService.ExecutiveDashboard executive(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return executive.getDashboard(CurrentUser.require().organizationId(), from(from, to), to(to));
    }

    /**
     * The caller's own work. No permission of its own: it only ever returns the caller's records, and each
     * block is included only if the caller may use the module it comes from (the same rule as the module's own pages).
     */
    @GetMapping("/my-work")
    @Operation(summary = "The signed-in user's own tasks, projects, jobs, tickets, collection calls and targets. Each block needs the permission of its module.")
    public MyWork myWork() {
        return myWork.myWork(CurrentUser.require());
    }
}
