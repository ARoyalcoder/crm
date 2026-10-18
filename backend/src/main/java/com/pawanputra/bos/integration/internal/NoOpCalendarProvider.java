package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.CalendarProvider;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * No-op calendar provider. Active when no real {@link CalendarProvider} bean is configured.
 *
 * <p>All methods log a warning and throw {@link UnsupportedOperationException} so callers fail
 * loudly rather than silently skipping calendar events.
 */
@Component
@ConditionalOnMissingBean(value = CalendarProvider.class, ignored = NoOpCalendarProvider.class)
public class NoOpCalendarProvider implements CalendarProvider {

    private static final Logger log = LoggerFactory.getLogger(NoOpCalendarProvider.class);

    @Override
    public String createEvent(String title, Instant start, Instant end, String description,
            List<String> attendeeEmails) {
        log.warn("Provider not configured: CALENDAR");
        throw new UnsupportedOperationException(
                "Calendar integration is not configured. Add a CalendarProvider bean (e.g. Google Calendar).");
    }

    @Override
    public void deleteEvent(String eventId) {
        log.warn("Provider not configured: CALENDAR");
        throw new UnsupportedOperationException(
                "Calendar integration is not configured. Add a CalendarProvider bean (e.g. Google Calendar).");
    }

    @Override
    public boolean testConnection() {
        log.warn("Provider not configured: CALENDAR");
        return false;
    }

    @Override
    public String getProviderName() {
        return "NOT_CONFIGURED";
    }
}
