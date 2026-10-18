package com.pawanputra.bos.analytics.internal;

import com.pawanputra.bos.analytics.AnalyticsModels.Period;
import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * What "today" and "this period" mean for the business. Dates are decided in the business time zone
 * ({@code app.finance.time-zone}, India by default), never in the server's or the database session's,
 * so "overdue" and "this month" flip at the business's midnight, as they do in the finance module.
 */
@Component
public class BusinessCalendar {

    /** Longest period a dashboard accepts. Keeps one request from scanning years of history. */
    public static final int MAX_DAYS = 800;

    private static final List<Integer> DEFAULT_AGEING_BOUNDS = List.of(30, 60, 90);

    private final Clock clock;
    private final ZoneId zone;
    private final List<Integer> ageingBounds;
    private final String currency;

    BusinessCalendar(Clock clock, Environment environment, @Value("${app.finance.time-zone:Asia/Kolkata}") String zoneId,
            @Value("${app.finance.currency:INR}") String currency) {
        this.clock = clock;
        this.zone = ZoneId.of(zoneId);
        this.currency = currency;
        // The same bands the finance module reports ageing in (app.finance.ageing-bucket-days), so the numbers agree.
        this.ageingBounds = Binder.get(environment)
                .bind("app.finance.ageing-bucket-days", Bindable.listOf(Integer.class))
                .orElse(DEFAULT_AGEING_BOUNDS);
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    public ZoneId zone() {
        return zone;
    }

    /** Upper ends of the ageing bands in days past due: 30, 60, 90 gives 1-30, 31-60, 61-90 and over 90. */
    public List<Integer> ageingBounds() {
        return ageingBounds;
    }

    public String currency() {
        return currency;
    }

    /** What the response says about the period: the dates, the comparison period, and the day "today" meant. */
    public Period period(Window window) {
        Window previous = window.previous();
        return new Period(window.from(), window.to(), window.days(), previous.from(), previous.to(), today(), window.granularity().name(), currency);
    }

    /** A validated period. Refuses a missing end, an end before the start, and a period longer than {@link #MAX_DAYS}. */
    public Window window(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Both 'from' and 'to' dates are required");
        }
        if (to.isBefore(from)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "'to' must not be before 'from'");
        }
        Window window = new Window(from, to, zone);
        if (window.days() > MAX_DAYS) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "The period may be at most " + MAX_DAYS + " days");
        }
        return window;
    }
}
