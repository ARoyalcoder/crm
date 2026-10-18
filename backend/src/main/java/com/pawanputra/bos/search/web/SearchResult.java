package com.pawanputra.bos.search.web;

/**
 * A single hit returned by the global search. Each field is a plain string so the front-end can
 * display it without further API calls.
 *
 * @param entityType "Customer", "Lead", "Invoice", etc.
 * @param entityId   UUID of the matched record, as a string.
 * @param title      Primary label, e.g. customer name or invoice number.
 * @param subtitle   Secondary label, e.g. email, status line or amount.
 * @param status     Current lifecycle status of the entity.
 * @param owner      Assigned user or created-by name.
 * @param url        Front-end route for navigating directly to the record.
 */
public record SearchResult(
        String entityType,
        String entityId,
        String title,
        String subtitle,
        String status,
        String owner,
        String url) {
}
