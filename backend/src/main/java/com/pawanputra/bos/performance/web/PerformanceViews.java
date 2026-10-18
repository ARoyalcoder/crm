package com.pawanputra.bos.performance.web;

import com.pawanputra.bos.performance.api.CommissionStatus;
import com.pawanputra.bos.performance.api.CommissionType;
import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.api.TargetType;
import com.pawanputra.bos.performance.internal.CommissionRecord;
import com.pawanputra.bos.performance.internal.CommissionRecordService.CommissionSummary;
import com.pawanputra.bos.performance.internal.CommissionRule;
import com.pawanputra.bos.performance.internal.PerformanceTarget;
import com.pawanputra.bos.performance.internal.PerformanceTargetService.PerformanceSummaryEntry;
import com.pawanputra.bos.performance.internal.PerformanceTargetService.TeamPerformanceEntry;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Immutable read-model records returned by the performance controllers. */
public final class PerformanceViews {

    private PerformanceViews() {
    }

    public record PerformanceTargetView(
            UUID id,
            UUID organizationId,
            UUID employeeId,
            TargetType targetType,
            TargetPeriod period,
            int periodYear,
            Integer periodMonth,
            Integer periodQuarter,
            BigDecimal targetValue,
            String notes,
            String createdBy,
            Instant createdAt,
            String updatedBy,
            Instant updatedAt) {

        static PerformanceTargetView from(PerformanceTarget t) {
            return new PerformanceTargetView(
                    t.getId(), t.getOrganizationId(), t.getEmployeeId(),
                    t.getTargetType(), t.getPeriod(), t.getPeriodYear(),
                    t.getPeriodMonth(), t.getPeriodQuarter(),
                    t.getTargetValue(), t.getNotes(),
                    t.getCreatedBy(), t.getCreatedAt(),
                    t.getUpdatedBy(), t.getUpdatedAt());
        }
    }

    public record PerformanceSummaryView(
            TargetType targetType,
            BigDecimal targetValue,
            BigDecimal actual,
            BigDecimal achievementPct,
            BigDecimal remaining,
            boolean overachieved,
            BigDecimal overachievementAmount,
            boolean tracked) {

        static PerformanceSummaryView from(PerformanceSummaryEntry e) {
            return new PerformanceSummaryView(
                    e.targetType(), e.targetValue(), e.actual(),
                    e.achievementPct(), e.remaining(),
                    e.overachieved(), e.overachievementAmount(), e.tracked());
        }
    }

    public record TeamPerformanceView(
            UUID employeeId,
            String employeeName,
            BigDecimal avgAchievementPct,
            int targetCount) {

        static TeamPerformanceView from(TeamPerformanceEntry e) {
            return new TeamPerformanceView(
                    e.employeeId(), e.employeeName(), e.avgAchievementPct(), e.targetCount());
        }
    }

    public record CommissionRuleView(
            UUID id,
            UUID organizationId,
            String name,
            UUID serviceId,
            String eligibleRoleCode,
            CommissionType commissionType,
            BigDecimal value,
            BigDecimal minOrderValue,
            boolean active,
            String createdBy,
            Instant createdAt,
            String updatedBy,
            Instant updatedAt) {

        static CommissionRuleView from(CommissionRule r) {
            return new CommissionRuleView(
                    r.getId(), r.getOrganizationId(), r.getName(),
                    r.getServiceId(), r.getEligibleRoleCode(),
                    r.getCommissionType(), r.getValue(), r.getMinOrderValue(),
                    r.isActive(),
                    r.getCreatedBy(), r.getCreatedAt(),
                    r.getUpdatedBy(), r.getUpdatedAt());
        }
    }

    public record CommissionRecordView(
            UUID id,
            UUID organizationId,
            UUID employeeId,
            UUID ruleId,
            String sourceType,
            UUID sourceId,
            BigDecimal baseAmount,
            BigDecimal commissionAmount,
            CommissionStatus status,
            int periodMonth,
            int periodYear,
            String notes,
            UUID approvedBy,
            Instant approvedAt,
            Instant paidAt,
            Instant createdAt,
            Instant updatedAt) {

        static CommissionRecordView from(CommissionRecord r) {
            return new CommissionRecordView(
                    r.getId(), r.getOrganizationId(), r.getEmployeeId(),
                    r.getRuleId(), r.getSourceType(), r.getSourceId(),
                    r.getBaseAmount(), r.getCommissionAmount(), r.getStatus(),
                    r.getPeriodMonth(), r.getPeriodYear(), r.getNotes(),
                    r.getApprovedBy(), r.getApprovedAt(), r.getPaidAt(),
                    r.getCreatedAt(), r.getUpdatedAt());
        }
    }

    public record CommissionSummaryView(
            BigDecimal pendingTotal,
            BigDecimal approvedTotal,
            BigDecimal paidTotal,
            BigDecimal cancelledTotal) {

        static CommissionSummaryView from(CommissionSummary s) {
            return new CommissionSummaryView(
                    s.pendingTotal(), s.approvedTotal(), s.paidTotal(), s.cancelledTotal());
        }
    }
}
