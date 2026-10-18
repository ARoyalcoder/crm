package com.pawanputra.bos.project;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.lessThan;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * The figures at the top of the Projects page. Which projects are "active", "completed" and "delayed" is decided by the
 * organization's own status configuration, deleted projects count for nothing, and cancelled ones carry no budget.
 */
class ProjectDashboardIT extends AbstractIntegrationTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

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

    private String project(String title, String status, LocalDate due, int budget, int revenue) {
        Map<String, Object> body = new HashMap<>();
        body.put("title", title);
        body.put("customerId", customerId);
        body.put("customerName", "Acme Solar");
        body.put("startDate", today.minusDays(60).toString());
        body.put("expectedCompletionDate", due.toString());
        body.put("budget", budget);
        body.put("revenue", revenue);
        if (status != null) {
            body.put("status", status);
        }
        return as(admin).body(body).post("/api/v1/projects").then().statusCode(lessThan(300)).extract().path("id");
    }

    private double number(String path) {
        Number value = as(admin).get("/api/v1/projects/dashboard").then().statusCode(200).extract().path(path);
        return value.doubleValue();
    }

    @Test
    void theCardsFollowTheOrganizationsOwnStatusFlagsAndIgnoreDeletedAndCancelledProjects() {
        // A status of the organization's own, flagged as "completed".
        as(admin).body(Map.of("code", "HANDED_OVER", "name", "Handed over", "displayOrder", 20, "color", "#16a34a",
                        "category", "DONE", "isDefault", false, "isCompleted", true, "isCancelled", false))
                .post("/api/v1/projects/statuses").then().statusCode(lessThan(300));

        project("On track", null, today.plusDays(10), 100_000, 120_000);
        project("Behind", null, today.minusDays(1), 50_000, 60_000);
        project("Finished", "HANDED_OVER", today.minusDays(30), 25_000, 30_000);
        String cancelled = project("Dropped", null, today.plusDays(5), 7_000, 9_000);
        as(admin).body(Map.of("status", "CANCELLED")).patch("/api/v1/projects/" + cancelled + "/status").then().statusCode(200);
        String deleted = project("Removed", null, today.minusDays(3), 1_000, 1_000);
        as(admin).delete("/api/v1/projects/" + deleted).then().statusCode(lessThan(300));

        as(admin).get("/api/v1/projects/dashboard").then().statusCode(200)
                .body("totalProjects", equalTo(4))          // the deleted one is not counted; the cancelled one is
                .body("activeProjects", equalTo(2))         // On track, Behind
                .body("completedProjects", equalTo(1))      // Finished, by the organization's own flag
                .body("delayedProjects", equalTo(1));       // Behind: open and past its date; Finished is not "delayed"

        // Cancelled and deleted projects carry no budget or revenue.
        assertThat(number("totalBudget")).isEqualTo(175_000.0);
        assertThat(number("totalRevenue")).isEqualTo(210_000.0);
    }
}
