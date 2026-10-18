package com.pawanputra.bos.intelligence;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * Customer intelligence over real HTTP and PostgreSQL: the score is worked out from the customer's own invoices,
 * payments, projects, tickets and contracts. The rules read those tables with plain SQL, so a wrong column name
 * only shows against a real schema; these tests are that check.
 */
class CustomerIntelligenceIT extends AbstractIntegrationTest {

    private static final String CUSTOMERS = "/api/v1/customers";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    /** A zero amount arrives as 0 or 0.00 depending on whether the value was computed or read back; both mean none. */
    private static final org.hamcrest.Matcher<Object> ZERO = anyOf(equalTo(0), equalTo(0.0f));

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    String admin;
    String customer;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        admin = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        customer = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post(CUSTOMERS).then().statusCode(201).extract().path("id");
    }

    private String invoice(int amount, LocalDate issued, LocalDate due) {
        String id = as(admin).body(Map.of("customerId", customer,
                        "items", List.of(Map.of("description", "Work done", "quantity", 1, "unitPrice", amount, "taxPercent", 0))))
                .post("/api/v1/invoices").then().statusCode(201).extract().path("invoice.id");
        Map<String, Object> dates = new HashMap<>();
        dates.put("issueDate", issued.toString());
        dates.put("dueDate", due.toString());
        as(admin).body(dates).post("/api/v1/invoices/" + id + "/issue").then().statusCode(200);
        return id;
    }

    private void pay(int amount, String invoice) {
        String cash = as(admin).get("/api/v1/payment-methods").path("find { it.code == 'CASH' }.id");
        as(admin).body(Map.of("customerId", customer, "amount", amount, "methodId", cash,
                        "allocations", List.of(Map.of("invoiceId", invoice, "amount", amount))))
                .post("/api/v1/payments").then().statusCode(201);
    }

    @Test
    void aCustomerWithNoHistoryHasASnapshotWithZeroes() {
        as(admin).get(CUSTOMERS + "/" + customer + "/intelligence").then().statusCode(200)
                .body("overdueInvoices", equalTo(0)).body("openTickets", equalTo(0)).body("activeProjects", equalTo(0))
                .body("hasActiveAmc", equalTo(false)).body("purchaseCount", equalTo(0))
                .body("totalRevenue", ZERO).body("clv", ZERO)
                .body("healthScore", greaterThanOrEqualTo(0));
    }

    @Test
    void overdueInvoicesLowerThePaymentScoreAndPayingThemRestoresIt() {
        String late = invoice(1000, today.minusDays(50), today.minusDays(45));

        as(admin).post(CUSTOMERS + "/" + customer + "/intelligence/refresh").then().statusCode(200)
                .body("overdueInvoices", equalTo(1)).body("totalRevenue", equalTo(1000.0f))
                .body("clv", ZERO).body("purchaseCount", equalTo(0))
                .body("scoreBreakdown", containsString("1 overdue invoice"));

        pay(1000, late);

        as(admin).post(CUSTOMERS + "/" + customer + "/intelligence/refresh").then().statusCode(200)
                .body("overdueInvoices", equalTo(0)).body("clv", equalTo(1000.0f)).body("purchaseCount", equalTo(1))
                .body("avgPurchaseValue", equalTo(1000.0f)).body("daysSinceLastPurchase", equalTo(0))
                // Paid, but about fifty days after it was issued: a late payment in the history.
                .body("scoreBreakdown", containsString("late payments in history"));
    }

    @Test
    void theExplanationHasOneReasonPerScoreContributor() {
        invoice(500, today, today.plusDays(15));

        as(admin).get(CUSTOMERS + "/" + customer + "/intelligence/explanation").then().statusCode(200)
                .body("reasons", hasSize(6))
                .body("headline", containsString("Why is this customer"));
    }

    @Test
    void anUnknownCustomerIsNotFoundAndTheSummaryWorks() {
        as(admin).get(CUSTOMERS + "/" + UUID.randomUUID() + "/intelligence").then().statusCode(404);
        as(admin).get(CUSTOMERS + "/" + customer + "/intelligence").then().statusCode(200);
        as(admin).get("/api/v1/intelligence/summary").then().statusCode(200);
        as(admin).get("/api/v1/intelligence/customers").then().statusCode(200).body("totalItems", greaterThanOrEqualTo(1));
    }

    @Test
    void anotherOrganizationsCustomerIsNotFound() {
        String outsider = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        as(outsider).get(CUSTOMERS + "/" + customer + "/intelligence").then().statusCode(404);
        given().get(CUSTOMERS + "/" + customer + "/intelligence").then().statusCode(401);
    }
}
