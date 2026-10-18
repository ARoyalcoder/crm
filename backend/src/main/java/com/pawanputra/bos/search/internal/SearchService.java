package com.pawanputra.bos.search.internal;

import com.pawanputra.bos.search.web.SearchResult;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Full-text search across all major CRM entities using PostgreSQL {@code tsvector}/{@code tsquery}.
 *
 * <p>Each entity is searched in its own sub-query via {@code UNION ALL} and ranked by
 * {@code ts_rank}. Results are ordered by rank (descending) and capped by {@code limit}.
 *
 * <p>Every sub-query filters by {@code organization_id} so data from other organisations is never
 * returned, regardless of the query string.
 */
@Service
public class SearchService {

    private static final int MAX_LIMIT = 50;

    private final JdbcTemplate jdbc;

    public SearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Search across entities.
     *
     * @param query       raw user input (handled safely by {@code plainto_tsquery})
     * @param entityTypes optional allowlist of entity type names; empty/null means all
     * @param orgId       organisation scope – always applied
     * @param userId      currently unused but kept for future per-user visibility rules
     * @param limit       maximum results (capped at {@value #MAX_LIMIT})
     * @return ranked list of search results
     */
    public List<SearchResult> search(
            String query, List<String> entityTypes, UUID orgId, UUID userId, int limit) {

        if (query == null || query.isBlank()) {
            return List.of();
        }

        int effectiveLimit = Math.min(limit, MAX_LIMIT);

        // Build the UNION ALL query.
        // Each sub-select produces: entity_type, entity_id, title, subtitle, status, owner, url, rank
        String sql = buildUnionQuery(entityTypes) + " ORDER BY rank DESC LIMIT ?";

        // Parameters: each sub-query needs (orgId, query) twice (once for vector, once for tsquery).
        List<Object> params = buildParams(orgId, query, entityTypes, effectiveLimit);

        return jdbc.query(sql, (rs, rowNum) -> new SearchResult(
                rs.getString("entity_type"),
                rs.getString("entity_id"),
                rs.getString("title"),
                rs.getString("subtitle"),
                rs.getString("status"),
                rs.getString("owner"),
                rs.getString("url")),
                params.toArray());
    }

    // -------------------------------- private helpers --------------------------------

    private String buildUnionQuery(List<String> entityTypes) {
        List<String> subQueries = new ArrayList<>();

        if (include("Customer", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Customer'            AS entity_type,
                        id::text              AS entity_id,
                        coalesce(display_name, '') AS title,
                        coalesce(email, '')   AS subtitle,
                        status                AS status,
                        coalesce(created_by, '') AS owner,
                        '/customers/' || id   AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(display_name,'') || ' ' || coalesce(email,'') || ' ' ||
                                coalesce(phone,'') || ' ' || coalesce(company_name,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM customers
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(display_name,'') || ' ' || coalesce(email,'') || ' ' ||
                              coalesce(phone,'') || ' ' || coalesce(company_name,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Lead", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Lead'                AS entity_type,
                        id::text              AS entity_id,
                        coalesce(contact_name,'') AS title,
                        coalesce(email,'')    AS subtitle,
                        status                AS status,
                        coalesce(created_by,'') AS owner,
                        '/leads/' || id       AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(contact_name,'') || ' ' || coalesce(company_name,'') || ' ' ||
                                coalesce(email,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM leads
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(contact_name,'') || ' ' || coalesce(company_name,'') || ' ' ||
                              coalesce(email,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Opportunity", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Opportunity'         AS entity_type,
                        id::text              AS entity_id,
                        coalesce(title,'')    AS title,
                        coalesce(customer_name,'') AS subtitle,
                        status                AS status,
                        coalesce(owner_name,'') AS owner,
                        '/opportunities'      AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(title,'') || ' ' || coalesce(customer_name,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM opportunities
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(title,'') || ' ' || coalesce(customer_name,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Quotation", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Quotation'           AS entity_type,
                        id::text              AS entity_id,
                        coalesce(quotation_number,'') AS title,
                        coalesce(title,'')    AS subtitle,
                        status                AS status,
                        coalesce(owner_name,'') AS owner,
                        '/quotations/' || id  AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(quotation_number,'') || ' ' || coalesce(title,'') || ' ' ||
                                coalesce(customer_name,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM quotations
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(quotation_number,'') || ' ' || coalesce(title,'') || ' ' ||
                              coalesce(customer_name,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Order", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Order'               AS entity_type,
                        id::text              AS entity_id,
                        coalesce(order_number,'') AS title,
                        coalesce(customer_name,'') AS subtitle,
                        status                AS status,
                        coalesce(owner_name,'') AS owner,
                        '/orders/' || id      AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(order_number,'') || ' ' || coalesce(title,'') || ' ' ||
                                coalesce(customer_name,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM orders
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(order_number,'') || ' ' || coalesce(title,'') || ' ' ||
                              coalesce(customer_name,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Project", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Project'             AS entity_type,
                        id::text              AS entity_id,
                        coalesce(title,'')    AS title,
                        coalesce(description,'') AS subtitle,
                        status                AS status,
                        coalesce(project_manager_name,'') AS owner,
                        '/projects/' || id    AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(title,'') || ' ' || coalesce(description,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM projects
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(title,'') || ' ' || coalesce(description,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Ticket", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Ticket'              AS entity_type,
                        id::text              AS entity_id,
                        coalesce(subject,'')  AS title,
                        coalesce(ticket_number,'') AS subtitle,
                        status                AS status,
                        coalesce(assigned_user_name,'') AS owner,
                        '/support/tickets/' || id AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(ticket_number,'') || ' ' || coalesce(subject,'') || ' ' ||
                                coalesce(description,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM tickets
                    WHERE organization_id = ?
                      AND to_tsvector('english',
                              coalesce(ticket_number,'') || ' ' || coalesce(subject,'') || ' ' ||
                              coalesce(description,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Invoice", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Invoice'             AS entity_type,
                        id::text              AS entity_id,
                        coalesce(invoice_number, 'DRAFT') AS title,
                        coalesce(customer_name,'') AS subtitle,
                        status                AS status,
                        coalesce(created_by,'') AS owner,
                        '/invoices/' || id    AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(invoice_number,'') || ' ' || coalesce(customer_name,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM invoices
                    WHERE organization_id = ?
                      AND deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(invoice_number,'') || ' ' || coalesce(customer_name,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Employee", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Employee'            AS entity_type,
                        ep.id::text           AS entity_id,
                        coalesce(u.full_name,'') AS title,
                        coalesce(u.email,'')  AS subtitle,
                        ep.employment_status  AS status,
                        ''                    AS owner,
                        '/workforce/employees/' || ep.id AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(u.full_name,'') || ' ' || coalesce(u.email,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM employee_profiles ep
                    JOIN users u ON u.id = ep.user_id
                    WHERE ep.organization_id = ?
                      AND u.deleted_at IS NULL
                      AND to_tsvector('english',
                              coalesce(u.full_name,'') || ' ' || coalesce(u.email,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (include("Vendor", entityTypes)) {
            subQueries.add("""
                    SELECT
                        'Vendor'              AS entity_type,
                        id::text              AS entity_id,
                        coalesce(company_name,'') AS title,
                        coalesce(contact_email,'') AS subtitle,
                        status                AS status,
                        ''                    AS owner,
                        '/vendors/' || id     AS url,
                        ts_rank(
                            to_tsvector('english',
                                coalesce(company_name,'') || ' ' || coalesce(contact_email,'')),
                            plainto_tsquery('english', ?)) AS rank
                    FROM vendors
                    WHERE organization_id = ?
                      AND to_tsvector('english',
                              coalesce(company_name,'') || ' ' || coalesce(contact_email,''))
                          @@ plainto_tsquery('english', ?)
                    """);
        }

        if (subQueries.isEmpty()) {
            return "SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL,0 WHERE FALSE";
        }

        return "SELECT entity_type, entity_id, title, subtitle, status, owner, url, rank FROM (\n"
                + String.join("\nUNION ALL\n", subQueries)
                + "\n) combined";
    }

    /**
     * Build the positional parameter list. Each sub-query uses three occurrences of the query string
     * plus one of orgId:  (query, orgId, query)
     */
    private List<Object> buildParams(UUID orgId, String query, List<String> entityTypes, int limit) {
        List<Object> params = new ArrayList<>();

        for (String type : activeTypes(entityTypes)) {
            if (include(type, entityTypes)) {
                params.add(query);     // ts_rank vector argument
                params.add(orgId);     // WHERE organization_id = ?  (a uuid column: pass the UUID, not its text)
                params.add(query);     // @@ plainto_tsquery
            }
        }

        params.add(limit);
        return params;
    }

    private List<String> activeTypes(List<String> entityTypes) {
        List<String> all = List.of(
                "Customer", "Lead", "Opportunity", "Quotation", "Order",
                "Project", "Ticket", "Invoice", "Employee", "Vendor");
        if (entityTypes == null || entityTypes.isEmpty()) {
            return all;
        }
        return all.stream().filter(t -> entityTypes.contains(t)).toList();
    }

    private boolean include(String type, List<String> entityTypes) {
        return entityTypes == null || entityTypes.isEmpty() || entityTypes.contains(type);
    }
}
