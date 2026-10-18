package com.pawanputra.bos.analytics;

import static java.util.Objects.requireNonNullElse;

import com.pawanputra.bos.analytics.AnalyticsModels.AttendancePoint;
import com.pawanputra.bos.analytics.AnalyticsModels.DepartmentCount;
import com.pawanputra.bos.analytics.AnalyticsModels.TopPerformer;
import com.pawanputra.bos.analytics.AnalyticsModels.WorkforceDashboard;
import com.pawanputra.bos.analytics.internal.BusinessCalendar;
import com.pawanputra.bos.analytics.internal.Window;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The workforce dashboard: headcount, attendance and, for those who may see commissions, who earned the most.
 *
 * <p>Attendance rate is present / (present + absent). Present counts PRESENT, HALF_DAY and WORK_FROM_HOME;
 * LEAVE and HOLIDAY are excused and do not pull the rate down.
 */
@Service
@Transactional(readOnly = true)
public class WorkforceAnalyticsService {

    private static final String PRESENT = "ar.type IN ('PRESENT', 'HALF_DAY', 'WORK_FROM_HOME')";
    private static final String COUNTED = "ar.type IN ('PRESENT', 'HALF_DAY', 'WORK_FROM_HOME', 'ABSENT')";

    private final NamedParameterJdbcTemplate jdbc;
    private final BusinessCalendar calendar;

    WorkforceAnalyticsService(NamedParameterJdbcTemplate jdbc, BusinessCalendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    /**
     * @param department optional filter on one department
     * @param commissions whether the caller may see commission amounts (COMMISSION_VIEW)
     */
    public WorkforceDashboard dashboard(UUID org, LocalDate from, LocalDate to, String department, boolean commissions) {
        Window window = calendar.window(from, to);
        LocalDate today = calendar.today();
        boolean filtered = department != null && !department.isBlank();
        MapSqlParameterSource p = new MapSqlParameterSource("org", org).addValue("from", window.from()).addValue("to", window.to())
                .addValue("start", window.start()).addValue("end", window.endExclusive()).addValue("today", today)
                .addValue("department", filtered ? department : null);

        long total = requireNonNullElse(jdbc.queryForObject(
                "SELECT count(*) FROM employee_profiles ep WHERE ep.organization_id = :org AND ep.employment_status = 'ACTIVE' AND (CAST(:department AS varchar) IS NULL OR ep.department = :department)",
                p, Long.class), 0L);

        List<DepartmentCount> byDepartment = jdbc.query(
                "SELECT ep.department, count(*) FROM employee_profiles ep WHERE ep.organization_id = :org AND ep.employment_status = 'ACTIVE' GROUP BY ep.department ORDER BY count(*) DESC, ep.department",
                p, (rs, n) -> new DepartmentCount(rs.getString(1), rs.getLong(2)));

        BigDecimal rate = jdbc.queryForObject(
                "SELECT CASE WHEN count(*) FILTER (WHERE " + COUNTED + ") = 0 THEN NULL "
                        + "ELSE round(100.0 * count(*) FILTER (WHERE " + PRESENT + ") / count(*) FILTER (WHERE " + COUNTED + "), 1) END "
                        + "FROM attendance_records ar JOIN employee_profiles ep ON ep.id = ar.employee_id "
                        + "WHERE ep.organization_id = :org AND ar.attendance_date BETWEEN :from AND :to AND (CAST(:department AS varchar) IS NULL OR ep.department = :department)",
                p, BigDecimal.class);

        String unit = window.granularity().truncUnit();
        String step = window.granularity().step();
        List<AttendancePoint> trend = jdbc.query(
                "WITH buckets AS (SELECT g::date AS bucket FROM generate_series(date_trunc('" + unit + "', CAST(:from AS timestamp)), CAST(:to AS timestamp), interval '" + step + "') g), "
                        + "att AS (SELECT date_trunc('" + unit + "', CAST(ar.attendance_date AS timestamp))::date AS bucket, "
                        + "  count(*) FILTER (WHERE " + COUNTED + ") AS counted, count(*) FILTER (WHERE " + PRESENT + ") AS present "
                        + "  FROM attendance_records ar JOIN employee_profiles ep ON ep.id = ar.employee_id "
                        + "  WHERE ep.organization_id = :org AND ar.attendance_date BETWEEN :from AND :to AND (CAST(:department AS varchar) IS NULL OR ep.department = :department) GROUP BY 1) "
                        + "SELECT b.bucket, CASE WHEN coalesce(att.counted, 0) = 0 THEN NULL ELSE round(100.0 * att.present / att.counted, 1) END, coalesce(att.counted, 0) "
                        + "FROM buckets b LEFT JOIN att ON att.bucket = b.bucket ORDER BY b.bucket",
                p, (rs, n) -> new AttendancePoint(rs.getObject(1, LocalDate.class), rs.getBigDecimal(2), rs.getLong(3)));

        long[] todayCounts = jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE " + PRESENT + "), count(*) FILTER (WHERE ar.type = 'LEAVE'), count(*) FILTER (WHERE ar.type = 'ABSENT') "
                        + "FROM attendance_records ar JOIN employee_profiles ep ON ep.id = ar.employee_id "
                        + "WHERE ep.organization_id = :org AND ar.attendance_date = :today AND (CAST(:department AS varchar) IS NULL OR ep.department = :department)",
                p, (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2), rs.getLong(3)});

        List<TopPerformer> top = null;
        if (commissions) {
            top = jdbc.query(
                    "SELECT max(ep.user_id::text), max(u.full_name), coalesce(sum(cr.commission_amount), 0) AS earned "
                            + "FROM commission_records cr JOIN employee_profiles ep ON ep.id = cr.employee_id LEFT JOIN users u ON u.id = ep.user_id "
                            + "WHERE cr.organization_id = :org AND cr.status IN ('APPROVED', 'PAID') AND cr.created_at >= :start AND cr.created_at < :end "
                            + "AND (CAST(:department AS varchar) IS NULL OR ep.department = :department) GROUP BY cr.employee_id ORDER BY earned DESC LIMIT 8",
                    p, (rs, n) -> new TopPerformer(rs.getString(1) == null ? null : UUID.fromString(rs.getString(1)), rs.getString(2), rs.getBigDecimal(3).setScale(2, RoundingMode.HALF_UP)));
        }

        return new WorkforceDashboard(calendar.period(window), total, byDepartment, rate, trend, todayCounts[0], todayCounts[1], todayCounts[2], top);
    }
}
