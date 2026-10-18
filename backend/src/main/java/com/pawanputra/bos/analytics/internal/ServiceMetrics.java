package com.pawanputra.bos.analytics.internal;

import static com.pawanputra.bos.analytics.internal.Sql.money;
import static com.pawanputra.bos.analytics.internal.Sql.percent;

import com.pawanputra.bos.analytics.AnalyticsModels.AgentLoad;
import com.pawanputra.bos.analytics.AnalyticsModels.AmcRenewal;
import com.pawanputra.bos.analytics.AnalyticsModels.AmcSummary;
import com.pawanputra.bos.analytics.AnalyticsModels.CountCompared;
import com.pawanputra.bos.analytics.AnalyticsModels.PriorityCount;
import com.pawanputra.bos.analytics.AnalyticsModels.ServiceOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.TicketBucket;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Support desk and contract figures. A ticket is open until it is RESOLVED or CLOSED; it has breached its SLA
 * when it is open and past its due time, or was resolved after it. AMC contracts are in force while their
 * status is ACTIVE or RENEWAL_PENDING and the end date has not passed.
 */
@Component
public class ServiceMetrics {

    private static final String OPEN_TICKET = "t.status NOT IN ('RESOLVED', 'CLOSED')";
    private static final String IN_FORCE = "a.status IN ('ACTIVE', 'RENEWAL_PENDING') AND a.end_date >= :today";

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    ServiceMetrics(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    private MapSqlParameterSource params(UUID org, Window window, LocalDate today) {
        return new MapSqlParameterSource("org", org).addValue("start", window.start()).addValue("end", window.endExclusive())
                .addValue("from", window.from()).addValue("to", window.to()).addValue("today", today).addValue("now", OffsetDateTime.now(clock));
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long value = jdbc.queryForObject(sql, params, Long.class);
        return value == null ? 0 : value;
    }

    private long opened(UUID org, Window window, LocalDate today) {
        return count("SELECT count(*) FROM tickets t WHERE t.organization_id = :org AND t.created_at >= :start AND t.created_at < :end", params(org, window, today));
    }

    private long resolved(UUID org, Window window, LocalDate today) {
        return count("SELECT count(*) FROM tickets t WHERE t.organization_id = :org AND t.resolved_at >= :start AND t.resolved_at < :end", params(org, window, today));
    }

    public ServiceOverview overview(UUID org, Window window, LocalDate today, boolean tickets, boolean amc) {
        Long open = null;
        Long breached = null;
        CountCompared opened = null;
        CountCompared resolved = null;
        BigDecimal avgHours = null;
        BigDecimal sla = null;
        List<TicketBucket> volume = null;
        if (tickets) {
            long[] now = jdbc.queryForObject(
                    "SELECT count(*), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.due_at < :now) FROM tickets t WHERE t.organization_id = :org AND " + OPEN_TICKET,
                    params(org, window, today), (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
            open = now[0];
            breached = now[1];
            Window previous = window.previous();
            opened = new CountCompared(opened(org, window, today), opened(org, previous, today));
            resolved = new CountCompared(resolved(org, window, today), resolved(org, previous, today));
            Object[] quality = jdbc.queryForObject(
                    "SELECT avg(extract(epoch FROM (t.resolved_at - t.created_at)) / 3600.0), "
                            + "count(*) FILTER (WHERE t.due_at IS NOT NULL), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.resolved_at <= t.due_at) "
                            + "FROM tickets t WHERE t.organization_id = :org AND t.resolved_at >= :start AND t.resolved_at < :end",
                    params(org, window, today), (rs, n) -> new Object[] {rs.getBigDecimal(1), rs.getLong(2), rs.getLong(3)});
            avgHours = quality[0] == null ? null : ((BigDecimal) quality[0]).setScale(1, RoundingMode.HALF_UP);
            sla = percent((Long) quality[2], (Long) quality[1]);
            volume = volume(org, window, today);
        }
        return new ServiceOverview(open, breached, opened, resolved, avgHours, sla, volume, amc ? amcSummary(org, window, today) : null);
    }

    /** Tickets opened and tickets resolved per day, week or month, with empty buckets filled in. */
    public List<TicketBucket> volume(UUID org, Window window, LocalDate today) {
        String unit = window.granularity().truncUnit();
        String step = window.granularity().step();
        String zone = window.zone().getId();
        return jdbc.query(
                "WITH buckets AS (SELECT g::date AS bucket FROM generate_series(date_trunc('" + unit + "', CAST(:from AS timestamp)), CAST(:to AS timestamp), interval '" + step + "') g), "
                        + "opened AS (SELECT date_trunc('" + unit + "', t.created_at AT TIME ZONE '" + zone + "')::date AS bucket, count(*) AS n FROM tickets t "
                        + "  WHERE t.organization_id = :org AND t.created_at >= :start AND t.created_at < :end GROUP BY 1), "
                        + "done AS (SELECT date_trunc('" + unit + "', t.resolved_at AT TIME ZONE '" + zone + "')::date AS bucket, count(*) AS n FROM tickets t "
                        + "  WHERE t.organization_id = :org AND t.resolved_at >= :start AND t.resolved_at < :end GROUP BY 1) "
                        + "SELECT b.bucket, coalesce(opened.n, 0), coalesce(done.n, 0) FROM buckets b LEFT JOIN opened ON opened.bucket = b.bucket LEFT JOIN done ON done.bucket = b.bucket ORDER BY b.bucket",
                params(org, window, today), (rs, n) -> new TicketBucket(rs.getObject(1, LocalDate.class), rs.getLong(2), rs.getLong(3)));
    }

    public AmcSummary amcSummary(UUID org, Window window, LocalDate today) {
        MapSqlParameterSource p = params(org, window, today);
        Object[] counts = jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE " + IN_FORCE + "), "
                        + "count(*) FILTER (WHERE " + IN_FORCE + " AND a.end_date <= :today + 30), "
                        + "count(*) FILTER (WHERE " + IN_FORCE + " AND a.end_date <= :today + 90), "
                        + "coalesce(sum(a.contract_value) FILTER (WHERE " + IN_FORCE + " AND a.end_date <= :today + 90), 0), "
                        + "count(*) FILTER (WHERE a.status = 'EXPIRED' AND a.end_date BETWEEN :from AND :to), "
                        + "count(*) FILTER (WHERE a.renewed_from_id IS NOT NULL AND a.created_at >= :start AND a.created_at < :end) "
                        + "FROM amc_contracts a WHERE a.organization_id = :org",
                p, (rs, n) -> new Object[] {rs.getLong(1), rs.getLong(2), rs.getLong(3), money(rs.getBigDecimal(4)), rs.getLong(5), rs.getLong(6)});
        List<AmcRenewal> upcoming = jdbc.query(
                "SELECT a.id, a.contract_number, c.display_name, a.end_date, a.contract_value, a.end_date - :today, a.renewal_status "
                        + "FROM amc_contracts a LEFT JOIN customers c ON c.id = a.customer_id WHERE a.organization_id = :org AND " + IN_FORCE + " AND a.end_date <= :today + 90 "
                        + "ORDER BY a.end_date LIMIT 6",
                p, (rs, n) -> new AmcRenewal(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getObject(4, LocalDate.class), money(rs.getBigDecimal(5)), rs.getLong(6), rs.getString(7)));
        return new AmcSummary((Long) counts[0], (Long) counts[1], (Long) counts[2], (BigDecimal) counts[3], (Long) counts[4], (Long) counts[5], upcoming);
    }

    // ---------------------------------------------------------------- dashboard extras

    public List<PriorityCount> openByPriority(UUID org, LocalDate today, Window window) {
        return jdbc.query(
                "SELECT t.priority, count(*), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.due_at < :now) FROM tickets t "
                        + "WHERE t.organization_id = :org AND " + OPEN_TICKET + " GROUP BY t.priority "
                        + "ORDER BY CASE t.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END",
                params(org, window, today), (rs, n) -> new PriorityCount(rs.getString(1), rs.getLong(2), rs.getLong(3)));
    }

    public List<AgentLoad> agentLoad(UUID org, LocalDate today, Window window) {
        return jdbc.query(
                "SELECT t.assigned_user_id, coalesce(max(t.assigned_user_name), 'Unassigned'), count(*), count(*) FILTER (WHERE t.due_at IS NOT NULL AND t.due_at < :now) "
                        + "FROM tickets t WHERE t.organization_id = :org AND " + OPEN_TICKET + " GROUP BY t.assigned_user_id ORDER BY count(*) DESC LIMIT 8",
                params(org, window, today), (rs, n) -> new AgentLoad(rs.getObject(1, UUID.class), rs.getString(2), rs.getLong(3), rs.getLong(4)));
    }

    public long warrantiesExpiring(UUID org, LocalDate today) {
        return count("SELECT count(*) FROM warranties w WHERE w.organization_id = :org AND w.status = 'ACTIVE' AND w.end_date BETWEEN :today AND :today + 90",
                new MapSqlParameterSource("org", org).addValue("today", today));
    }
}
