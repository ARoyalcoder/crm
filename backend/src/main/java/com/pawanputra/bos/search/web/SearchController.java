package com.pawanputra.bos.search.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.search.internal.RecentSearchService;
import com.pawanputra.bos.search.internal.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Global search endpoint. Searches across all major CRM entities using PostgreSQL full-text search.
 *
 * <pre>
 *   GET  /api/v1/search?q=&amp;types=Customer,Lead&amp;limit=20
 *   GET  /api/v1/search/recent
 *   DELETE /api/v1/search/recent
 * </pre>
 *
 * What a person can find is what they could open: each kind of record is searched only if the caller holds
 * the view permission of the module it belongs to (customers need CUSTOMER_VIEW, invoices FINANCE_VIEW, and so on),
 * and the queries always scope results to the caller's {@code organization_id}. Someone who may open none of those
 * modules (a vendor or partner account) may not search at all.
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/search")
@Tag(name = "Global Search")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class SearchController {

    private static final int DEFAULT_LIMIT = 20;
    private static final int DEFAULT_RECENT_LIMIT = 10;

    /** The permission that lets a person see each kind of record in search results. */
    static final Map<String, String> TYPE_PERMISSION = Map.of(
            "Customer", Permissions.CUSTOMER_VIEW,
            "Lead", Permissions.LEAD_VIEW,
            "Opportunity", Permissions.OPPORTUNITY_VIEW,
            "Quotation", Permissions.QUOTATION_VIEW,
            "Order", Permissions.ORDER_VIEW,
            "Project", Permissions.PROJECT_VIEW,
            "Ticket", Permissions.TICKET_VIEW,
            "Invoice", Permissions.FINANCE_VIEW,
            "Employee", Permissions.WORKFORCE_VIEW,
            "Vendor", Permissions.VENDOR_VIEW);

    /**
     * Searching needs the view permission of at least one searchable kind of record. Written out in full because an
     * annotation value must be a constant; SearchControllerPermissionsTest keeps it in step with {@link #TYPE_PERMISSION}.
     */
    static final String CAN_SEARCH = "hasAnyAuthority('" + Permissions.CUSTOMER_VIEW + "', '" + Permissions.LEAD_VIEW + "', '"
            + Permissions.OPPORTUNITY_VIEW + "', '" + Permissions.QUOTATION_VIEW + "', '" + Permissions.ORDER_VIEW + "', '"
            + Permissions.PROJECT_VIEW + "', '" + Permissions.TICKET_VIEW + "', '" + Permissions.FINANCE_VIEW + "', '"
            + Permissions.WORKFORCE_VIEW + "', '" + Permissions.VENDOR_VIEW + "')";

    private final SearchService searchService;
    private final RecentSearchService recentSearchService;

    public SearchController(SearchService searchService, RecentSearchService recentSearchService) {
        this.searchService = searchService;
        this.recentSearchService = recentSearchService;
    }

    @GetMapping
    @PreAuthorize(CAN_SEARCH)
    @Operation(summary = "Full-text search across the CRM records the caller may view. Requires the view permission of at least one searchable module.")
    public List<SearchResult> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> types,
            @RequestParam(defaultValue = "20") int limit) {

        CurrentUser user = CurrentUser.require();

        // Only the kinds of record this person may open, whatever they asked for.
        List<String> searchable = TYPE_PERMISSION.entrySet().stream()
                .filter(entry -> user.hasPermission(entry.getValue()))
                .map(Map.Entry::getKey)
                .sorted()
                .toList();
        List<String> kinds = types == null || types.isEmpty() ? searchable : types.stream().filter(searchable::contains).toList();
        if (kinds.isEmpty()) {
            return List.of();
        }

        List<SearchResult> results = searchService.search(q, kinds, user.organizationId(), user.id(), limit);

        // Record query in history (fire-and-forget, non-fatal if it fails)
        if (q != null && !q.isBlank()) {
            try {
                recentSearchService.recordSearch(user.id(), q, user.organizationId());
            } catch (Exception ignored) {
                // Search history is best-effort; never fail the search itself
            }
        }

        return results;
    }

    @GetMapping("/recent")
    @PreAuthorize(CAN_SEARCH)
    @Operation(summary = "Get recent search queries for the current user")
    public List<String> recentSearches(
            @RequestParam(defaultValue = "10") int limit) {
        CurrentUser user = CurrentUser.require();
        return recentSearchService.getRecentSearches(user.id(), user.organizationId(), limit);
    }

    @DeleteMapping("/recent")
    @PreAuthorize(CAN_SEARCH)
    @Operation(summary = "Clear recent search history for the current user")
    public ResponseEntity<Void> clearRecentSearches() {
        CurrentUser user = CurrentUser.require();
        recentSearchService.clearRecentSearches(user.id(), user.organizationId());
        return ResponseEntity.noContent().build();
    }
}
