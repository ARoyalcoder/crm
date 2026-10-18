package com.pawanputra.bos.analytics;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The shapes the analytics API returns. Money is a {@link BigDecimal} in the organization's currency;
 * a figure that cannot be worked out (nothing to divide by, no data) is {@code null}, never zero, so a
 * client can tell "none" from "nothing recorded". A block that the caller's permissions do not cover is
 * {@code null} as a whole.
 */
public final class AnalyticsModels {

    private AnalyticsModels() {
    }

    /** The period asked for, the equal period before it that trends are compared with, and the day "today" means. */
    public record Period(
            LocalDate from, LocalDate to, long days, LocalDate previousFrom, LocalDate previousTo,
            LocalDate asOf, String granularity, String currency) {
    }

    /** A figure for the period and the same figure for the period before it. */
    public record Compared(BigDecimal value, BigDecimal previous) {
    }

    /** A count for the period and the same count for the period before it. */
    public record CountCompared(long value, long previous) {
    }

    // ------------------------------------------------------------------------------------ finance

    /** An amount that is still open, and how many invoices make it up. */
    public record Open(BigDecimal amount, long invoices) {
    }

    /** The open pipeline: what the open deals are worth and how many there are. */
    public record PipelineValue(BigDecimal amount, long deals) {
    }

    /** One bucket of the revenue / collections series. {@code bucket} is the first day of the day, week or month. */
    public record TrendPoint(LocalDate bucket, BigDecimal invoiced, BigDecimal collected) {
    }

    /** What is owed, by how long it has been due. {@code key} is stable (NOT_DUE, B1, B2, B3, B4); {@code label} is for people. */
    public record AgeingBand(String key, String label, BigDecimal amount, long invoices) {
    }

    /** Invoiced revenue of one service vertical. {@code code} is null for lines not linked to a catalog service. */
    public record VerticalShare(String code, String name, BigDecimal amount) {
    }

    public record DebtorRow(UUID customerId, String customerName, BigDecimal outstanding, BigDecimal overdue, long invoices, Integer oldestDaysOverdue) {
    }

    public record MethodShare(String method, BigDecimal amount, long payments) {
    }

    /**
     * What recorded project costs say about the projects completed in the period. The system has no
     * expense ledger: these are the cost columns of the projects themselves (material, labour, vendor,
     * travel, other), so overheads and salaries are NOT in them and this is not a profit and loss.
     */
    public record ProjectEconomics(
            long projects, BigDecimal revenue, BigDecimal recordedCost, BigDecimal margin, BigDecimal marginPct,
            BigDecimal material, BigDecimal labour, BigDecimal vendor, BigDecimal travel, BigDecimal other,
            /** Recorded cost of projects that only carry a single cost figure: part of {@code recordedCost}, in none of the categories above. */
            BigDecimal notItemised,
            List<VerticalMargin> byVertical) {
    }

    public record VerticalMargin(String code, String name, long projects, BigDecimal revenue, BigDecimal recordedCost, BigDecimal marginPct) {
    }

    public record FinanceOverview(
            Compared invoiced,
            Compared collected,
            Open outstanding,
            Open overdue,
            /** Collected as a share of invoiced in the period; null when nothing was invoiced. */
            BigDecimal collectionRatePct,
            List<TrendPoint> trend,
            List<AgeingBand> ageing,
            List<VerticalShare> byVertical) {
    }

    public record FinanceDashboard(
            Period period,
            FinanceOverview overview,
            /** Outstanding / invoiced x days: roughly how many days of sales are waiting to be collected. Null when nothing was invoiced. */
            BigDecimal dsoDays,
            List<DebtorRow> topDebtors,
            List<MethodShare> collectedByMethod,
            ProjectEconomics projectEconomics) {
    }

    // -------------------------------------------------------------------------------------- sales

    public record FunnelStage(String key, String label, long count) {
    }

    public record StageValue(String stage, int order, long opportunities, BigDecimal amount) {
    }

    /**
     * The sales picture. The lead figures need LEAD_VIEW and the opportunity figures OPPORTUNITY_VIEW;
     * a part the caller may not see is null.
     */
    public record SalesOverview(
            PipelineValue pipeline,
            BigDecimal weightedPipeline,
            Compared won,
            CountCompared wonCount,
            CountCompared leadsCreated,
            /** Won / (won + lost) among the leads closed in the period; null when none closed. */
            BigDecimal leadWinRatePct,
            Long leadsLost,
            /** The leads created in the period, by how far they got. Each stage includes every later one. */
            List<FunnelStage> leadFunnel,
            List<StageValue> pipelineByStage) {
    }

    public record SalesPerson(UUID userId, String name, long orders, BigDecimal orderValue, long wonDeals) {
    }

    public record QuotationSummary(long created, long pendingApproval, long accepted, BigDecimal acceptedValue, long open) {
    }

    public record OrderBucket(LocalDate bucket, long orders, BigDecimal value) {
    }

    /** Orders created in the period, cancelled ones left out. {@code averageValue} is null when there were none. */
    public record OrdersSummary(long count, BigDecimal value, BigDecimal averageValue, List<SalesPerson> topSalespeople, List<OrderBucket> trend) {
    }

    /**
     * The sales dashboard. Each part needs the permission of the module it comes from: the deals and leads
     * (inside {@code overview} and {@code wonByVertical}) need OPPORTUNITY_VIEW / LEAD_VIEW, {@code quotations} needs
     * QUOTATION_VIEW and {@code orders} needs ORDER_VIEW; a part the caller may not see is null.
     */
    public record SalesDashboard(
            Period period,
            SalesOverview overview,
            List<VerticalShare> wonByVertical,
            QuotationSummary quotations,
            OrdersSummary orders) {
    }

    // ------------------------------------------------------------------------------------ projects

    public record StatusCount(String code, String name, int order, boolean terminal, long count) {
    }

    public record DelayedProject(
            UUID id, String number, String title, String customer, String manager, long daysLate, int progressPct) {
    }

    public record ProjectsOverview(
            long active,
            long delayed,
            CountCompared completed,
            /** Share of projects completed in the period that finished on or before their expected date; null when none completed. */
            BigDecimal onTimePct,
            BigDecimal avgDurationDays,
            List<StatusCount> byStatus,
            List<DelayedProject> delayedProjects) {
    }

    public record CostRow(UUID id, String number, String title, BigDecimal expectedCost, BigDecimal recordedCost, int progressPct) {
    }

    public record DeliveryBucket(LocalDate bucket, long onTime, long late) {
    }

    public record MilestoneRow(UUID projectId, String projectTitle, String milestone, LocalDate dueDate, String status, long daysFromToday) {
    }

    public record ProjectsDashboard(
            Period period,
            ProjectsOverview overview,
            BigDecimal expectedCostTotal,
            BigDecimal recordedCostTotal,
            List<CostRow> costComparison,
            List<DeliveryBucket> deliveryTrend,
            List<MilestoneRow> upcomingMilestones,
            ProjectEconomics economics) {
    }

    // ------------------------------------------------------------------------------------ service

    public record TicketBucket(LocalDate bucket, long opened, long resolved) {
    }

    public record AmcRenewal(UUID id, String number, String customer, LocalDate endDate, BigDecimal value, long daysLeft, String renewalStatus) {
    }

    public record AmcSummary(long active, long expiring30, long expiring90, BigDecimal expiring90Value, long lapsedInPeriod, long renewedInPeriod, List<AmcRenewal> upcoming) {
    }

    /** The service picture. Ticket figures need TICKET_VIEW and the AMC block AMC_VIEW; a part the caller may not see is null. */
    public record ServiceOverview(
            Long openTickets,
            Long breachedOpen,
            CountCompared opened,
            CountCompared resolved,
            BigDecimal avgResolutionHours,
            /** Of the tickets resolved in the period that had a due time, the share resolved by it; null when there were none. */
            BigDecimal slaCompliancePct,
            List<TicketBucket> volume,
            AmcSummary amc) {
    }

    public record PriorityCount(String priority, long open, long breached) {
    }

    public record AgentLoad(UUID userId, String name, long open, long breached) {
    }

    /** The ticket lists need TICKET_VIEW and the warranty count AMC_VIEW; a part the caller may not see is null, never an empty list or zero. */
    public record ServiceDashboard(
            Period period,
            ServiceOverview overview,
            List<PriorityCount> openByPriority,
            List<AgentLoad> agentLoad,
            Long warrantiesExpiring90) {
    }

    // --------------------------------------------------------------------------------------- workforce

    public record DepartmentCount(String department, long employees) {
    }

    /** Attendance rate of one bucket: present (including half days and work from home) out of present + absent. */
    public record AttendancePoint(LocalDate bucket, BigDecimal ratePct, long records) {
    }

    public record TopPerformer(UUID userId, String name, BigDecimal commissionAmount) {
    }

    /** Commission figures are money: {@code topPerformers} is null unless the caller may see commissions (COMMISSION_VIEW). */
    public record WorkforceDashboard(
            Period period,
            long totalEmployees,
            List<DepartmentCount> byDepartment,
            /** Present / (present + absent) over the period; leave and holidays are excused and left out. Null with no records. */
            BigDecimal avgAttendanceRate,
            List<AttendancePoint> attendanceTrend,
            long presentToday,
            long onLeaveToday,
            long absentToday,
            List<TopPerformer> topPerformers) {
    }

    // ----------------------------------------------------------------------------------- control tower

    /** Every block is null when the caller may not see that part of the business. */
    public record ControlTower(
            Period period,
            FinanceOverview finance,
            SalesOverview sales,
            ProjectsOverview projects,
            ServiceOverview service) {
    }

    // -------------------------------------------------------------------------------------- my work

    public record TaskRow(
            UUID id, String title, String type, String priority, String status, Instant dueAt, boolean overdue,
            String entityType, UUID entityId, String entityName) {
    }

    public record Tasks(long dueToday, long overdue, long upcoming7Days, long completedThisWeek, List<TaskRow> items) {
    }

    public record ProjectTaskRow(UUID id, String title, UUID projectId, String projectTitle, LocalDate dueDate, String status, String priority, boolean overdue) {
    }

    public record ProjectTasks(long open, long overdue, List<ProjectTaskRow> items) {
    }

    public record AssignedProject(
            UUID id, String number, String title, String customer, String status, int progressPct,
            LocalDate expectedCompletion, long daysLeft, String role) {
    }

    public record JobRow(UUID id, String number, String title, String customer, Instant scheduledStart, String status) {
    }

    public record Jobs(long today, long upcoming, List<JobRow> items) {
    }

    public record TicketRow(UUID id, String number, String subject, String customer, String priority, String status, Instant dueAt, boolean breached) {
    }

    public record MyTickets(long open, long breached, List<TicketRow> items) {
    }

    public record CollectionRow(UUID id, UUID invoiceId, String invoiceNumber, String customer, BigDecimal outstanding, LocalDate dueDate, String priority, String status) {
    }

    public record CollectionWork(long open, long overdue, List<CollectionRow> items) {
    }

    /** One of the user's own targets this month. {@code actual} and {@code achievementPct} are null for a target the system does not measure yet. */
    public record TargetProgress(String type, String label, BigDecimal target, BigDecimal actual, BigDecimal achievementPct, boolean tracked) {
    }

    public record Targets(int year, int month, List<TargetProgress> items) {
    }

    public record MyWork(
            UUID userId,
            String name,
            LocalDate asOf,
            Tasks tasks,
            ProjectTasks projectTasks,
            List<AssignedProject> projects,
            Jobs jobs,
            MyTickets tickets,
            CollectionWork collections,
            Targets targets) {
    }
}
