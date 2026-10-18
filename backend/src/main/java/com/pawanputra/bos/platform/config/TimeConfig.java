package com.pawanputra.bos.platform.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfig {

    /**
     * Inject this instead of calling {@code Instant.now()} so time can be controlled in tests. Instants are the same
     * everywhere; the zone is the business's ({@code app.finance.time-zone}, India by default), so that
     * {@code LocalDate.now(clock)} is "today" for the people using the system and not the server's UTC date.
     */
    @Bean
    Clock clock(@Value("${app.finance.time-zone:Asia/Kolkata}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }
}
