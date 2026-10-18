package com.pawanputra.bos.analytics.internal;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * The period a dashboard is scoped to: whole calendar days, both ends included, in the business time
 * zone. Timestamps are compared against {@link #start()} (inclusive) and {@link #endExclusive()}, so a
 * ticket opened at 23:30 on the last day is in the period and one opened at 00:10 the next day is not,
 * whatever time zone the database session happens to use.
 *
 * @param from first day of the period
 * @param to   last day of the period
 * @param zone the business time zone ({@code app.finance.time-zone})
 */
public record Window(LocalDate from, LocalDate to, ZoneId zone) {

    /** How finely a time series is cut. Chosen from the length of the period so a chart has 6 to 45 points. */
    public enum Granularity {
        DAY("day", "1 day"),
        WEEK("week", "1 week"),
        MONTH("month", "1 month");

        private final String truncUnit;
        private final String step;

        Granularity(String truncUnit, String step) {
            this.truncUnit = truncUnit;
            this.step = step;
        }

        /** The argument of {@code date_trunc}. Always one of three literals, so it is safe to put in SQL text. */
        public String truncUnit() {
            return truncUnit;
        }

        /** The interval between buckets, for {@code generate_series}. Also a fixed literal. */
        public String step() {
            return step;
        }
    }

    /** Number of calendar days in the period. */
    public long days() {
        return ChronoUnit.DAYS.between(from, to) + 1;
    }

    /** The period of the same length that ends the day before this one starts: what trends are compared with. */
    public Window previous() {
        long length = days();
        return new Window(from.minusDays(length), from.minusDays(1), zone);
    }

    /** Start of the first day, as an instant: the inclusive lower bound for timestamp columns. */
    public OffsetDateTime start() {
        return from.atStartOfDay(zone).toOffsetDateTime();
    }

    /** Start of the day after the last day: the exclusive upper bound for timestamp columns. */
    public OffsetDateTime endExclusive() {
        return to.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
    }

    public Granularity granularity() {
        long length = days();
        if (length <= 45) {
            return Granularity.DAY;
        }
        if (length <= 200) {
            return Granularity.WEEK;
        }
        return Granularity.MONTH;
    }
}
