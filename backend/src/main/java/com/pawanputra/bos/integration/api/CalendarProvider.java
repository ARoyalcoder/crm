package com.pawanputra.bos.integration.api;

import java.time.Instant;
import java.util.List;

/**
 * Provider contract for calendar event management.
 *
 * <p>Implementations live in feature modules that depend on this interface only; the platform
 * never imports a concrete provider.
 */
public interface CalendarProvider {

    /**
     * Creates a calendar event and returns the provider-assigned event ID.
     *
     * @param title           event title
     * @param start           start time (UTC)
     * @param end             end time (UTC)
     * @param description     optional description
     * @param attendeeEmails  list of attendee email addresses; may be empty
     * @return the provider-assigned event ID, for later deletion or lookup
     */
    String createEvent(String title, Instant start, Instant end, String description,
            List<String> attendeeEmails);

    /**
     * Deletes a previously created calendar event.
     *
     * @param eventId the ID returned by {@link #createEvent}
     */
    void deleteEvent(String eventId);

    /** Returns {@code true} if the provider can currently reach its upstream service. */
    boolean testConnection();

    /** Human-readable provider name, e.g. {@code "GOOGLE_CALENDAR"}. */
    String getProviderName();
}
