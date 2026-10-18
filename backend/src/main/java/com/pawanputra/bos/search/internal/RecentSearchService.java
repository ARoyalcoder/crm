package com.pawanputra.bos.search.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists and retrieves per-user recent search queries in the {@code recent_searches} table.
 * Duplicate consecutive searches by the same user are deduplicated to avoid cluttering the list.
 */
@Service
public class RecentSearchService {

    private static final int DEFAULT_LIMIT = 10;

    private final JdbcTemplate jdbc;

    public RecentSearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Persist a search query for the given user. If the user's most recent search in this
     * organisation is identical (case-insensitive), we update its timestamp rather than inserting a
     * duplicate row.
     */
    @Transactional
    public void recordSearch(UUID userId, String query, UUID orgId) {
        if (query == null || query.isBlank()) {
            return;
        }
        String trimmed = query.trim();

        // Check whether the last entry for this user+org is already the same query.
        List<String> last = jdbc.queryForList(
                """
                SELECT query FROM recent_searches
                WHERE user_id = ? AND organization_id = ?
                ORDER BY searched_at DESC
                LIMIT 1
                """,
                String.class,
                userId, orgId);

        if (!last.isEmpty() && last.get(0).equalsIgnoreCase(trimmed)) {
            // Just bump the timestamp.
            jdbc.update(
                    """
                    UPDATE recent_searches
                    SET searched_at = now()
                    WHERE user_id = ? AND organization_id = ? AND lower(query) = lower(?)
                      AND searched_at = (
                          SELECT max(searched_at) FROM recent_searches
                          WHERE user_id = ? AND organization_id = ?
                      )
                    """,
                    userId, orgId, trimmed,
                    userId, orgId);
        } else {
            jdbc.update(
                    "INSERT INTO recent_searches (user_id, organization_id, query) VALUES (?, ?, ?)",
                    userId, orgId, trimmed);
        }
    }

    /**
     * Return the most recent distinct search queries for the user, newest first.
     *
     * @param userId user whose history to fetch
     * @param orgId  organisation scope
     * @param limit  maximum number of entries to return
     */
    public List<String> getRecentSearches(UUID userId, UUID orgId, int limit) {
        int effectiveLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        return jdbc.queryForList(
                """
                SELECT query FROM (
                    SELECT DISTINCT ON (lower(query)) query, searched_at
                    FROM recent_searches
                    WHERE user_id = ? AND organization_id = ?
                    ORDER BY lower(query), searched_at DESC
                ) deduplicated
                ORDER BY searched_at DESC
                LIMIT ?
                """,
                String.class,
                userId, orgId, effectiveLimit);
    }

    /**
     * Delete all recent searches for the given user in the organisation.
     */
    @Transactional
    public void clearRecentSearches(UUID userId, UUID orgId) {
        jdbc.update(
                "DELETE FROM recent_searches WHERE user_id = ? AND organization_id = ?",
                userId, orgId);
    }
}
