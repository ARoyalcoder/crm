package com.pawanputra.bos.search.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

/** The permission that opens search and the permission each kind of result needs are one list written twice; this keeps them one. */
class SearchControllerPermissionsTest {

    @Test
    void theGuardOnSearchNamesExactlyThePermissionsOfTheSearchableKinds() {
        Set<String> guard = new TreeSet<>();
        Matcher quoted = Pattern.compile("'([A-Z_]+)'").matcher(SearchController.CAN_SEARCH);
        while (quoted.find()) {
            guard.add(quoted.group(1));
        }

        assertThat(guard).containsExactlyInAnyOrderElementsOf(SearchController.TYPE_PERMISSION.values());
    }

    @Test
    void everyKindOfResultSearchIsAbleToReturnNeedsAPermission() {
        assertThat(SearchController.TYPE_PERMISSION.keySet()).containsExactlyInAnyOrder(
                "Customer", "Lead", "Opportunity", "Quotation", "Order", "Project", "Ticket", "Invoice", "Employee", "Vendor");
    }
}
