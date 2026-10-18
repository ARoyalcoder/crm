package com.pawanputra.bos.analytics.internal;

import static com.pawanputra.bos.analytics.internal.Sql.money;
import static com.pawanputra.bos.analytics.internal.Sql.percent;

import com.pawanputra.bos.analytics.AnalyticsModels.Compared;
import com.pawanputra.bos.analytics.AnalyticsModels.CountCompared;
import com.pawanputra.bos.analytics.AnalyticsModels.FunnelStage;
import com.pawanputra.bos.analytics.AnalyticsModels.OrderBucket;
import com.pawanputra.bos.analytics.AnalyticsModels.PipelineValue;
import com.pawanputra.bos.analytics.AnalyticsModels.QuotationSummary;
import com.pawanputra.bos.analytics.AnalyticsModels.SalesOverview;
import com.pawanputra.bos.analytics.AnalyticsModels.SalesPerson;
import com.pawanputra.bos.analytics.AnalyticsModels.StageValue;
import com.pawanputra.bos.analytics.AnalyticsModels.VerticalShare;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Lead, opportunity, quotation and order figures. Leads have a status of OPEN, WON or LOST and no owner;
 * opportunities carry an owner, a value, a probability and a stage. The "leads" figures follow the
 * leads created in the period; "closed" figures follow when the lead or deal was closed.
 */
@Component
public class SalesMetrics {

    private final NamedParameterJdbcTemplate jdbc;

    SalesMetrics(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static MapSqlParameterSource params(UUID org, Window window) {
        return new MapSqlParameterSource("org", org).addValue("start", window.start()).addValue("end", window.endExclusive())
                .addValue("from", window.from()).addValue("to", window.to());
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long value = jdbc.queryForObject(sql, params, Long.class);
        return value == null ? 0 : value;
    }

    public long leadsCreated(UUID org, Window window) {
        return count("SELECT count(*) FROM leads l WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.created_at >= :start AND l.created_at < :end", params(org, window));
    }

    /** {won, lost} among the leads closed in the period. */
    public long[] leadsClosed(UUID org, Window window) {
        return jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE l.status = 'WON'), count(*) FILTER (WHERE l.status = 'LOST') FROM leads l "
                        + "WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.closed_at >= :start AND l.closed_at < :end",
                params(org, window), (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2)});
    }

    /** The leads created in the period by how far they got: each stage includes every later one, so the funnel only narrows. */
    public List<FunnelStage> leadFunnel(UUID org, Window window) {
        long[] counts = jdbc.queryForObject(
                "SELECT count(*), "
                        + "count(*) FILTER (WHERE x.has_activity OR x.qualification_status <> 'NOT_STARTED' OR x.status <> 'OPEN'), "
                        + "count(*) FILTER (WHERE x.qualification_status = 'QUALIFIED' OR x.status = 'WON'), "
                        + "count(*) FILTER (WHERE x.status = 'WON') FROM ("
                        + "  SELECT l.status, l.qualification_status, EXISTS (SELECT 1 FROM lead_activities a WHERE a.lead_id = l.id) AS has_activity "
                        + "  FROM leads l WHERE l.organization_id = :org AND l.deleted_at IS NULL AND l.created_at >= :start AND l.created_at < :end) x",
                params(org, window), (rs, n) -> new long[] {rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4)});
        return List.of(
                new FunnelStage("CREATED", "Leads created", counts[0]),
                new FunnelStage("ENGAGED", "Worked", counts[1]),
                new FunnelStage("QUALIFIED", "Qualified", counts[2]),
                new FunnelStage("WON", "Won", counts[3]));
    }

    /** Open pipeline right now: amount, number of deals, and the probability-weighted amount. */
    public Object[] pipeline(UUID org) {
        return jdbc.queryForObject(
                "SELECT coalesce(sum(o.value), 0), count(*), coalesce(sum(o.value * o.probability / 100.0), 0) FROM opportunities o "
                        + "WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'OPEN'",
                new MapSqlParameterSource("org", org),
                (rs, n) -> new Object[] {new PipelineValue(money(rs.getBigDecimal(1)), rs.getLong(2)), money(rs.getBigDecimal(3))});
    }

    public List<StageValue> pipelineByStage(UUID org) {
        return jdbc.query(
                "SELECT ps.name, ps.display_order, count(o.id), coalesce(sum(o.value), 0) FROM pipeline_stages ps "
                        + "JOIN pipelines pl ON pl.id = ps.pipeline_id AND pl.organization_id = :org "
                        + "LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.organization_id = :org AND o.status = 'OPEN' AND o.deleted_at IS NULL "
                        + "WHERE NOT ps.is_won AND NOT ps.is_lost GROUP BY ps.name, ps.display_order ORDER BY ps.display_order",
                new MapSqlParameterSource("org", org),
                (rs, n) -> new StageValue(rs.getString(1), rs.getInt(2), rs.getLong(3), money(rs.getBigDecimal(4))));
    }

    /** {amount, count} of deals won in the period. */
    public Object[] won(UUID org, Window window) {
        return jdbc.queryForObject(
                "SELECT coalesce(sum(o.value), 0), count(*) FROM opportunities o WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'WON' "
                        + "AND o.won_at >= :start AND o.won_at < :end",
                params(org, window), (rs, n) -> new Object[] {money(rs.getBigDecimal(1)), rs.getLong(2)});
    }

    /** Overview with the parts the caller is allowed to see; the rest are null. */
    public SalesOverview overview(UUID org, Window window, boolean leads, boolean opportunities) {
        Window previous = window.previous();
        PipelineValue pipeline = null;
        BigDecimal weighted = null;
        Compared won = null;
        CountCompared wonCount = null;
        List<StageValue> stages = null;
        if (opportunities) {
            Object[] open = pipeline(org);
            pipeline = (PipelineValue) open[0];
            weighted = (BigDecimal) open[1];
            Object[] now = won(org, window);
            Object[] before = won(org, previous);
            won = new Compared((BigDecimal) now[0], (BigDecimal) before[0]);
            wonCount = new CountCompared((Long) now[1], (Long) before[1]);
            stages = pipelineByStage(org);
        }
        CountCompared created = null;
        BigDecimal winRate = null;
        Long lost = null;
        List<FunnelStage> funnel = null;
        if (leads) {
            created = new CountCompared(leadsCreated(org, window), leadsCreated(org, previous));
            long[] closed = leadsClosed(org, window);
            winRate = percent(closed[0], closed[0] + closed[1]);
            lost = closed[1];
            funnel = leadFunnel(org, window);
        }
        return new SalesOverview(pipeline, weighted, won, wonCount, created, winRate, lost, funnel, stages);
    }

    // ---------------------------------------------------------------- dashboard extras

    public List<VerticalShare> wonByVertical(UUID org, Window window) {
        return jdbc.query(
                "SELECT v.code, v.name, coalesce(sum(o.value), 0) FROM service_verticals v "
                        + "LEFT JOIN opportunities o ON o.vertical_code = v.code AND o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'WON' "
                        + "AND o.won_at >= :start AND o.won_at < :end WHERE v.active GROUP BY v.code, v.name, v.display_order ORDER BY v.display_order",
                params(org, window), (rs, n) -> new VerticalShare(rs.getString(1), rs.getString(2), money(rs.getBigDecimal(3))));
    }

    public QuotationSummary quotations(UUID org, Window window) {
        return jdbc.queryForObject(
                "SELECT count(*) FILTER (WHERE q.created_at >= :start AND q.created_at < :end), "
                        + "count(*) FILTER (WHERE q.status = 'PENDING_APPROVAL'), "
                        + "count(*) FILTER (WHERE q.accepted_at >= :start AND q.accepted_at < :end), "
                        + "coalesce(sum(q.final_amount) FILTER (WHERE q.accepted_at >= :start AND q.accepted_at < :end), 0), "
                        + "count(*) FILTER (WHERE q.status IN ('APPROVED', 'SENT', 'VIEWED')) "
                        + "FROM quotations q WHERE q.organization_id = :org AND q.deleted_at IS NULL",
                params(org, window), (rs, n) -> new QuotationSummary(rs.getLong(1), rs.getLong(2), rs.getLong(3), money(rs.getBigDecimal(4)), rs.getLong(5)));
    }

    /** {orders, value} created in the period, cancelled ones left out. */
    public Object[] orders(UUID org, Window window) {
        return jdbc.queryForObject(
                "SELECT count(*), coalesce(sum(o.final_amount), 0) FROM orders o WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status <> 'CANCELLED' "
                        + "AND o.created_at >= :start AND o.created_at < :end",
                params(org, window), (rs, n) -> new Object[] {rs.getLong(1), money(rs.getBigDecimal(2))});
    }

    public List<OrderBucket> ordersTrend(UUID org, Window window) {
        String unit = window.granularity().truncUnit();
        String step = window.granularity().step();
        String zone = window.zone().getId();
        return jdbc.query(
                "WITH buckets AS (SELECT g::date AS bucket FROM generate_series(date_trunc('" + unit + "', CAST(:from AS timestamp)), CAST(:to AS timestamp), interval '" + step + "') g), "
                        + "ord AS (SELECT date_trunc('" + unit + "', (o.created_at AT TIME ZONE '" + zone + "'))::date AS bucket, count(*) AS n, sum(o.final_amount) AS v FROM orders o "
                        + "WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status <> 'CANCELLED' AND o.created_at >= :start AND o.created_at < :end GROUP BY 1) "
                        + "SELECT b.bucket, coalesce(ord.n, 0), coalesce(ord.v, 0) FROM buckets b LEFT JOIN ord ON ord.bucket = b.bucket ORDER BY b.bucket",
                params(org, window), (rs, n) -> new OrderBucket(rs.getObject(1, LocalDate.class), rs.getLong(2), money(rs.getBigDecimal(3))));
    }

    public List<SalesPerson> topSalespeople(UUID org, Window window, int limit) {
        return jdbc.query(
                "WITH ord AS (SELECT o.owner_id, max(o.owner_name) AS name, count(*) AS n, sum(o.final_amount) AS v FROM orders o "
                        + "  WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status <> 'CANCELLED' AND o.created_at >= :start AND o.created_at < :end GROUP BY o.owner_id), "
                        + "won AS (SELECT o.owner_id, max(o.owner_name) AS name, count(*) AS n FROM opportunities o "
                        + "  WHERE o.organization_id = :org AND o.deleted_at IS NULL AND o.status = 'WON' AND o.won_at >= :start AND o.won_at < :end GROUP BY o.owner_id) "
                        + "SELECT coalesce(ord.owner_id, won.owner_id), coalesce(ord.name, won.name), coalesce(ord.n, 0), coalesce(ord.v, 0), coalesce(won.n, 0) "
                        + "FROM ord FULL OUTER JOIN won ON won.owner_id = ord.owner_id ORDER BY coalesce(ord.v, 0) DESC, coalesce(won.n, 0) DESC LIMIT :limit",
                params(org, window).addValue("limit", limit),
                (rs, n) -> new SalesPerson(rs.getObject(1, UUID.class), rs.getString(2), rs.getLong(3), money(rs.getBigDecimal(4)), rs.getLong(5)));
    }
}
