package com.pawanputra.bos.servicecontract;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.servicecontract.internal.WarrantyService;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/** A warranty that has ended stops showing as active: the daily run expires it, and leaves the ones still in force. */
class WarrantyExpiryIT extends AbstractIntegrationTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;
    @Autowired WarrantyService warrantyService;

    String admin;
    String customerId;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        admin = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        customerId = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
    }

    private String warrantyEnding(LocalDate end) {
        return as(admin).body(Map.of("customerId", customerId, "description", "Cameras and recorder",
                        "startDate", today.minusYears(2).toString(), "endDate", end.toString()))
                .post("/api/v1/warranties").then().statusCode(201).extract().path("id");
    }

    @Test
    void anEndedWarrantyIsExpiredAndOneThatEndsTodayStaysActive() {
        String ended = warrantyEnding(today.minusDays(1));
        String endsToday = warrantyEnding(today);
        String later = warrantyEnding(today.plusMonths(6));

        assertTrue(warrantyService.markExpiredWarranties() >= 1);

        as(admin).get("/api/v1/warranties/" + ended).then().statusCode(200).body("status", equalTo("EXPIRED"));
        as(admin).get("/api/v1/warranties/" + endsToday).then().statusCode(200).body("status", equalTo("ACTIVE"));
        as(admin).get("/api/v1/warranties/" + later).then().statusCode(200).body("status", equalTo("ACTIVE"));
        // Running it again changes nothing.
        assertTrue(warrantyService.markExpiredWarranties() >= 0);
        as(admin).get("/api/v1/warranties/by-customer/" + customerId).then().statusCode(200)
                .body("expiredCount", equalTo(1)).body("activeCount", greaterThanOrEqualTo(2));
    }
}
