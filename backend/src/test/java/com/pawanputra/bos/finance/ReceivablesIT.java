package com.pawanputra.bos.finance;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * The receivables screens (dashboard, outstanding and overdue lists) and the document storage summary, over
 * real HTTP and PostgreSQL. They once failed on a real database (date arithmetic, a repository return type)
 * because nothing exercised them; these tests do.
 */
class ReceivablesIT extends AbstractIntegrationTest {

    private static final String INVOICES = "/api/v1/invoices";
    private static final String RECEIVABLES = "/api/v1/receivables";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    String admin;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        admin = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
    }

    private String invoice(String customer, int amount, LocalDate issued, LocalDate due) {
        String id = as(admin).body(Map.of("customerId", customer,
                        "items", List.of(Map.of("description", "Work done", "quantity", 1, "unitPrice", amount, "taxPercent", 0))))
                .post(INVOICES).then().statusCode(201).extract().path("invoice.id");
        Map<String, Object> dates = new HashMap<>();
        dates.put("issueDate", issued.toString());
        dates.put("dueDate", due.toString());
        as(admin).body(dates).post(INVOICES + "/" + id + "/issue").then().statusCode(200);
        return id;
    }

    @Test
    void theDashboardAndListsAgreeWithTheInvoicesThatAreOwed() {
        String customer = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
        String forty = invoice(customer, 1000, today.minusDays(50), today.minusDays(45)); // 45 days late
        String five = invoice(customer, 300, today.minusDays(10), today.minusDays(5));    // 5 days late
        invoice(customer, 500, today, today.plusDays(15));                                // not due yet

        as(admin).get(RECEIVABLES + "/dashboard").then().statusCode(200)
                .body("totalReceivable", equalTo(1800.0f)).body("overdue", equalTo(1300.0f))
                .body("dueToday", equalTo(0.0f)).body("dueThisWeek", equalTo(0.0f))
                // Past-due money by how long it has been due: 5 days in the first band, 45 in the second.
                .body("ageingBuckets.label", contains("0–30 days", "31–60 days"))
                .body("ageingBuckets.count", contains(1, 1))
                .body("ageingBuckets.amount", contains(300.0f, 1000.0f));

        // Soonest due first; the one that is not due yet has no days overdue.
        as(admin).get(RECEIVABLES + "/outstanding").then().statusCode(200)
                .body("totalItems", equalTo(3))
                .body("items.id", org.hamcrest.Matchers.hasItems(forty, five))
                .body("items.daysOverdue", contains(45, 5, 0));

        as(admin).get(RECEIVABLES + "/overdue").then().statusCode(200)
                .body("totalItems", equalTo(2))
                .body("items.id", contains(forty, five))
                .body("items.daysOverdue", contains(45, 5))
                .body("items.outstanding", contains(1000.0f, 300.0f));
    }

    @Test
    void anOrganizationWithNothingOwedGetsEmptyListsAndZeroTotals() {
        as(admin).get(RECEIVABLES + "/dashboard").then().statusCode(200)
                .body("totalReceivable", equalTo(0.0f)).body("overdue", equalTo(0.0f)).body("ageingBuckets.size()", equalTo(0));
        as(admin).get(RECEIVABLES + "/outstanding").then().statusCode(200).body("totalItems", equalTo(0));
        as(admin).get(RECEIVABLES + "/overdue").then().statusCode(200).body("totalItems", equalTo(0));
    }

    @Test
    void documentStorageOfAnOrganizationWithNoDocumentsIsZero() {
        as(admin).get("/api/v1/documents/storage-summary").then().statusCode(200)
                .body("totalFiles", equalTo(0)).body("totalSizeBytes", equalTo(0));
    }
}
