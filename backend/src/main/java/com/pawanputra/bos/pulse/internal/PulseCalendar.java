package com.pawanputra.bos.pulse.internal;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** What "today" is for the insight engines: the business day (India by default), not the server's. */
@Component
class PulseCalendar {

    private final Clock clock;
    private final ZoneId zone;

    PulseCalendar(Clock clock, @Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        this.clock = clock;
        this.zone = ZoneId.of(zone);
    }

    LocalDate today() {
        return LocalDate.now(clock.withZone(zone));
    }

    Instant now() {
        return clock.instant();
    }

    ZoneId zone() {
        return zone;
    }
}
