package com.pawanputra.bos.search;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * What global search shows is what the caller could open anyway: a kind of record is searched only if they hold
 * that module's view permission, and someone who may open none of them cannot search at all.
 */
class GlobalSearchIT extends AbstractIntegrationTest {

    private static final String SEARCH = "/api/v1/search";

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    Account admin;
    String adminToken;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        admin = accounts.activeUser(RoleCodes.ADMIN);
        adminToken = tokenFor(admin);
        // One name that appears on a customer and on an invoice.
        String customerId = as(adminToken).body(Map.of("type", "BUSINESS", "companyName", "Zenith Solar Works", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
        String invoice = as(adminToken).body(Map.of("customerId", customerId,
                        "items", List.of(Map.of("description", "Survey", "quantity", 1, "unitPrice", 1000, "taxPercent", 0))))
                .post("/api/v1/invoices").then().statusCode(201).extract().path("invoice.id");
        as(adminToken).body(Map.of()).post("/api/v1/invoices/" + invoice + "/issue").then().statusCode(200);
    }

    private String signedInAs(String role) {
        return tokenFor(accounts.activeColleagueOf(admin, role));
    }

    @Test
    void searchNeedsASignIn() {
        given().queryParam("q", "Zenith").get(SEARCH).then().statusCode(401);
        given().get(SEARCH + "/recent").then().statusCode(401);
    }

    @Test
    void anAdministratorFindsEveryKindOfRecordTheNameAppearsOn() {
        as(adminToken).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200)
                .body("entityType", containsInAnyOrder("Customer", "Invoice"));
    }

    @Test
    void eachKindOfRecordNeedsItsOwnViewPermission() {
        // A sales executive may open customers but not invoices: the customer is found, the invoice is not.
        as(signedInAs(RoleCodes.SALES_EXECUTIVE)).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200)
                .body("entityType", contains("Customer"));

        // Finance may open both.
        as(signedInAs(RoleCodes.FINANCE)).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200)
                .body("entityType", containsInAnyOrder("Customer", "Invoice"));

        // HR may open employees only; the customer and the invoice are none of their business.
        as(signedInAs(RoleCodes.HR)).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200).body("$", empty());
    }

    @Test
    void askingForAKindOfRecordThatIsNotAllowedFindsNothing() {
        as(signedInAs(RoleCodes.SALES_EXECUTIVE)).queryParam("q", "Zenith").queryParam("types", "Invoice").get(SEARCH).then()
                .statusCode(200).body("$", empty());
        // Asking for both returns only the allowed one.
        as(signedInAs(RoleCodes.SALES_EXECUTIVE)).queryParam("q", "Zenith").queryParam("types", "Invoice", "Customer").get(SEARCH).then()
                .statusCode(200).body("entityType", contains("Customer")).body("entityType", not(hasItem("Invoice")));
    }

    @Test
    void thoseWhoMayOpenNothingSearchableAreRefused() {
        for (String role : List.of(RoleCodes.VENDOR, RoleCodes.PARTNER)) {
            String token = signedInAs(role);
            as(token).queryParam("q", "Zenith").get(SEARCH).then().statusCode(403).body("code", equalTo("FORBIDDEN"));
            as(token).get(SEARCH + "/recent").then().statusCode(403);
            as(token).delete(SEARCH + "/recent").then().statusCode(403);
        }
    }

    @Test
    void recentSearchesAreRememberedPerPersonAndCanBeCleared() {
        as(adminToken).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200);
        as(adminToken).get(SEARCH + "/recent").then().statusCode(200).body("$", contains("Zenith"));

        // A colleague's history is their own.
        as(signedInAs(RoleCodes.SALES_EXECUTIVE)).get(SEARCH + "/recent").then().statusCode(200).body("$", empty());

        as(adminToken).delete(SEARCH + "/recent").then().statusCode(204);
        as(adminToken).get(SEARCH + "/recent").then().statusCode(200).body("$", empty());
    }

    @Test
    void anotherOrganizationsRecordsAreNeverFound() {
        String outsider = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        as(outsider).queryParam("q", "Zenith").get(SEARCH).then().statusCode(200).body("$", empty());
    }
}
