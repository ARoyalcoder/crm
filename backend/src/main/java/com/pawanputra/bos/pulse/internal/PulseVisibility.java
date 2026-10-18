package com.pawanputra.bos.pulse.internal;

import com.pawanputra.bos.identity.api.Permissions;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Which insights a person may see. An insight is about a record (an invoice, a lead, a project ...), so seeing it
 * means being allowed to see that kind of record: the feed never tells someone without FINANCE_VIEW about an
 * overdue invoice, or someone without LEAD_VIEW about a cold lead. Insights about no particular record are open to
 * everyone who may open the feed.
 */
final class PulseVisibility {

    private PulseVisibility() {
    }

    /** The entity types whose insights a holder of {@code permissions} may see. Never empty (a placeholder keeps SQL IN lists valid). */
    static Set<String> allowedEntityTypes(Set<String> permissions) {
        Set<String> types = new LinkedHashSet<>();
        if (permissions.contains(Permissions.LEAD_VIEW)) {
            types.add("Lead");
        }
        if (permissions.contains(Permissions.CUSTOMER_VIEW)) {
            types.add("Customer");
        }
        if (permissions.contains(Permissions.OPPORTUNITY_VIEW)) {
            types.add("Opportunity");
        }
        if (permissions.contains(Permissions.FINANCE_VIEW) || permissions.contains(Permissions.RECEIVABLES_VIEW)) {
            types.add("Invoice");
            types.add("Payment");
        }
        if (permissions.contains(Permissions.PROJECT_VIEW)) {
            types.add("Project");
        }
        if (permissions.contains(Permissions.TICKET_VIEW)) {
            types.add("Ticket");
        }
        if (permissions.contains(Permissions.AMC_VIEW)) {
            types.add("AMC");
        }
        if (permissions.contains(Permissions.QUOTATION_VIEW)) {
            types.add("Quotation");
        }
        if (types.isEmpty()) {
            types.add("-");
        }
        return types;
    }
}
