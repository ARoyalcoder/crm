package com.pawanputra.bos.performance.internal;

import com.pawanputra.bos.performance.api.TargetPeriod;
import com.pawanputra.bos.performance.api.TargetType;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PerformanceTargetService {

    // ---- nested types -------------------------------------------------------

    /** Command object for setting/updating a performance target. */
    public record SetTargetCmd(
            TargetType targetType,
            TargetPeriod period,
            int periodYear,
            Integer periodMonth,
            Integer periodQuarter,
            BigDecimal targetValue,
            String notes) {
    }

    /**
     * One row of the performance summary: target vs. actual for a given metric.
     * All arithmetic is done transparently on real data from the source modules.
     */
    public record PerformanceSummaryEntry(
            TargetType targetType,
            BigDecimal targetValue,
            BigDecimal actual,
            BigDecimal achievementPct,
            BigDecimal remaining,
            boolean overachieved,
            BigDecimal overachievementAmount,
            /** False for a metric the system does not measure yet: its "actual" is not a real zero, so it must not be shown as 0%. */
            boolean tracked) {
    }

    // ---- fields -------------------------------------------------------------

    private final PerformanceTargetRepository targets;
    private final EntityManager em;

    public PerformanceTargetService(PerformanceTargetRepository targets, EntityManager em) {
        this.targets = targets;
        this.em = em;
    }

    // ---- commands -----------------------------------------------------------

    /** Upsert: creates the target if it does not exist, otherwise updates targetValue and notes. */
    public PerformanceTarget setTarget(UUID organizationId, UUID employeeId, SetTargetCmd cmd) {
        Optional<PerformanceTarget> existing = targets
                .findByOrganizationIdAndEmployeeIdAndTargetTypeAndPeriodAndPeriodYearAndPeriodMonthAndPeriodQuarter(
                        organizationId, employeeId,
                        cmd.targetType(), cmd.period(), cmd.periodYear(),
                        cmd.periodMonth(), cmd.periodQuarter());

        if (existing.isPresent()) {
            PerformanceTarget t = existing.get();
            t.setTargetValue(cmd.targetValue());
            t.setNotes(cmd.notes());
            return targets.save(t);
        }

        return targets.save(new PerformanceTarget(
                organizationId, employeeId,
                cmd.targetType(), cmd.period(), cmd.periodYear(),
                cmd.periodMonth(), cmd.periodQuarter(),
                cmd.targetValue(), cmd.notes()));
    }

    // ---- queries ------------------------------------------------------------

    public List<PerformanceTarget> getTargets(UUID organizationId, UUID employeeId,
                                               int year, TargetPeriod period) {
        if (period != null) {
            return targets.findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriod(
                    organizationId, employeeId, year, period);
        }
        return targets.findAllByOrganizationIdAndEmployeeIdAndPeriodYear(organizationId, employeeId, year);
    }

    /**
     * Queries real data from the source modules to find out how much of a given metric the
     * employee has actually achieved in the given calendar month.
     *
     * <p>Rules are transparent:
     * <ul>
     *   <li>SALES_REVENUE — sum of {@code final_amount} from non-cancelled orders owned by the
     *       employee (via user_id) whose {@code created_at} falls in the month.</li>
     *   <li>ORDER_COUNT — count of non-cancelled orders owned by the employee in the month.</li>
     *   <li>FOLLOW_UP_COUNT — count of activities completed by the employee in the month.</li>
     *   <li>PROJECT_COMPLETION — count of projects the employee manages that were completed in the month.</li>
     *   <li>All others — not measured yet ({@link #isTracked}); the actual is reported as 0 but flagged untracked.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public BigDecimal getActualPerformance(UUID organizationId, UUID employeeId,
                                            TargetType targetType, int year, int month) {
        return switch (targetType) {
            case SALES_REVENUE -> querySalesRevenue(organizationId, employeeId, year, month);
            case ORDER_COUNT -> queryOrderCount(organizationId, employeeId, year, month);
            case FOLLOW_UP_COUNT -> queryFollowUpCount(organizationId, employeeId, year, month);
            case PROJECT_COMPLETION -> queryProjectCompletions(organizationId, employeeId, year, month);
            default -> BigDecimal.ZERO;
        };
    }

    /** Whether the system measures this kind of target from real records. An untracked target is shown as "not measured", never as 0%. */
    public static boolean isTracked(TargetType type) {
        return switch (type) {
            case SALES_REVENUE, ORDER_COUNT, FOLLOW_UP_COUNT, PROJECT_COMPLETION -> true;
            default -> false;
        };
    }

    /**
     * Returns a full summary for every target set for the employee in the given month.
     * Achievement % = (actual / target) × 100, capped to 2 decimal places.
     */
    @Transactional(readOnly = true)
    public List<PerformanceSummaryEntry> getPerformanceSummary(UUID organizationId, UUID employeeId,
                                                                 int year, int month) {
        List<PerformanceTarget> monthlyTargets = targets
                .findAllByOrganizationIdAndEmployeeIdAndPeriodYearAndPeriod(
                        organizationId, employeeId, year, TargetPeriod.MONTHLY)
                .stream()
                .filter(t -> t.getPeriodMonth() != null && t.getPeriodMonth() == month)
                .toList();

        List<PerformanceSummaryEntry> summary = new ArrayList<>();
        for (PerformanceTarget t : monthlyTargets) {
            BigDecimal actual = getActualPerformance(organizationId, employeeId, t.getTargetType(), year, month);
            BigDecimal target = t.getTargetValue();
            BigDecimal pct = target.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : actual.multiply(BigDecimal.valueOf(100)).divide(target, 2, RoundingMode.HALF_UP);
            boolean over = actual.compareTo(target) >= 0;
            BigDecimal remaining = over ? BigDecimal.ZERO : target.subtract(actual).setScale(2, RoundingMode.HALF_UP);
            BigDecimal overAmt = over ? actual.subtract(target).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            summary.add(new PerformanceSummaryEntry(t.getTargetType(), target, actual, pct, remaining, over, overAmt, isTracked(t.getTargetType())));
        }
        return summary;
    }

    // ---- private query helpers ---------------------------------------------

    /**
     * Sum of final_amount of non-cancelled orders owned by the employee (matched via user_id)
     * whose created_at falls in the given calendar month.
     */
    private BigDecimal querySalesRevenue(UUID organizationId, UUID employeeId, int year, int month) {
        var query = em.createNativeQuery(
                "SELECT COALESCE(SUM(o.final_amount), 0) "
                + "FROM orders o "
                + "JOIN employee_profiles ep ON ep.user_id = o.owner_id "
                + "WHERE ep.id = :empId "
                + "  AND o.organization_id = :orgId "
                + "  AND o.status != 'CANCELLED' "
                + "  AND o.deleted_at IS NULL "
                + "  AND EXTRACT(YEAR  FROM o.created_at AT TIME ZONE 'UTC') = :year "
                + "  AND EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'UTC') = :month");
        query.setParameter("empId", employeeId);
        query.setParameter("orgId", organizationId);
        query.setParameter("year", year);
        query.setParameter("month", month);
        Object result = query.getSingleResult();
        return result == null ? BigDecimal.ZERO : new BigDecimal(result.toString());
    }

    /**
     * Count of non-cancelled orders owned by the employee in the given calendar month.
     */
    private BigDecimal queryOrderCount(UUID organizationId, UUID employeeId, int year, int month) {
        var query = em.createNativeQuery(
                "SELECT COUNT(o.id) "
                + "FROM orders o "
                + "JOIN employee_profiles ep ON ep.user_id = o.owner_id "
                + "WHERE ep.id = :empId "
                + "  AND o.organization_id = :orgId "
                + "  AND o.status != 'CANCELLED' "
                + "  AND o.deleted_at IS NULL "
                + "  AND EXTRACT(YEAR  FROM o.created_at AT TIME ZONE 'UTC') = :year "
                + "  AND EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'UTC') = :month");
        query.setParameter("empId", employeeId);
        query.setParameter("orgId", organizationId);
        query.setParameter("year", year);
        query.setParameter("month", month);
        Object result = query.getSingleResult();
        return result == null ? BigDecimal.ZERO : new BigDecimal(result.toString());
    }

    /**
     * Count of activities completed by the employee in the given calendar month.
     * Linked via employee_profiles.user_id = activities.owner_id.
     */
    private BigDecimal queryFollowUpCount(UUID organizationId, UUID employeeId, int year, int month) {
        var query = em.createNativeQuery(
                "SELECT COUNT(a.id) "
                + "FROM activities a "
                + "JOIN employee_profiles ep ON ep.user_id = a.owner_id "
                + "WHERE ep.id = :empId "
                + "  AND a.organization_id = :orgId "
                + "  AND a.status = 'COMPLETED' "
                + "  AND a.deleted_at IS NULL "
                + "  AND EXTRACT(YEAR  FROM a.completed_at AT TIME ZONE 'UTC') = :year "
                + "  AND EXTRACT(MONTH FROM a.completed_at AT TIME ZONE 'UTC') = :month");
        query.setParameter("empId", employeeId);
        query.setParameter("orgId", organizationId);
        query.setParameter("year", year);
        query.setParameter("month", month);
        Object result = query.getSingleResult();
        return result == null ? BigDecimal.ZERO : new BigDecimal(result.toString());
    }

    /**
     * Count of projects the employee manages that were completed in the given calendar month: completed means the
     * project status is flagged as completed in the organization's project statuses, and the completion date is in the month.
     */
    private BigDecimal queryProjectCompletions(UUID organizationId, UUID employeeId, int year, int month) {
        var query = em.createNativeQuery(
                "SELECT COUNT(p.id) "
                + "FROM projects p "
                + "JOIN employee_profiles ep ON ep.user_id = p.project_manager_id "
                + "LEFT JOIN project_statuses ps ON ps.organization_id = p.organization_id AND ps.code = p.status "
                + "WHERE ep.id = :empId "
                + "  AND p.organization_id = :orgId "
                + "  AND p.deleted_at IS NULL "
                + "  AND COALESCE(ps.is_completed, p.status = 'COMPLETED') "
                + "  AND EXTRACT(YEAR  FROM p.actual_completion_date) = :year "
                + "  AND EXTRACT(MONTH FROM p.actual_completion_date) = :month");
        query.setParameter("empId", employeeId);
        query.setParameter("orgId", organizationId);
        query.setParameter("year", year);
        query.setParameter("month", month);
        Object result = query.getSingleResult();
        return result == null ? BigDecimal.ZERO : new BigDecimal(result.toString());
    }

    // ---- team performance helpers (used by controller) ----------------------

    /**
     * For a manager: return the average achievement % across all monthly targets for each direct
     * report in the given month. Returns an empty list if the employee is not a manager.
     */
    @Transactional(readOnly = true)
    public List<TeamPerformanceEntry> getTeamPerformance(UUID organizationId, UUID managerId, int year, int month) {
        // Find all direct reports
        @SuppressWarnings("unchecked")
        List<Object[]> reports = em.createNativeQuery(
                "SELECT ep.id, u.full_name "
                + "FROM employee_profiles ep "
                + "JOIN users u ON u.id = ep.user_id AND u.deleted_at IS NULL "
                + "WHERE ep.manager_id = :managerId AND ep.organization_id = :orgId")
                .setParameter("managerId", managerId)
                .setParameter("orgId", organizationId)
                .getResultList();

        List<TeamPerformanceEntry> result = new ArrayList<>();
        for (Object[] row : reports) {
            UUID reportId = (UUID) row[0];
            String name = (String) row[1];
            List<PerformanceSummaryEntry> summary = getPerformanceSummary(organizationId, reportId, year, month);
            BigDecimal avgPct = summary.isEmpty() ? BigDecimal.ZERO
                    : summary.stream()
                            .map(PerformanceSummaryEntry::achievementPct)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(summary.size()), 2, RoundingMode.HALF_UP);
            result.add(new TeamPerformanceEntry(reportId, name, avgPct, summary.size()));
        }
        result.sort((a, b) -> b.avgAchievementPct().compareTo(a.avgAchievementPct()));
        return result;
    }

    public record TeamPerformanceEntry(
            UUID employeeId,
            String employeeName,
            BigDecimal avgAchievementPct,
            int targetCount) {
    }
}
