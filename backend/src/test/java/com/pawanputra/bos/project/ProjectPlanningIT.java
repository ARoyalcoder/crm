package com.pawanputra.bos.project;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.lessThan;

import com.pawanputra.bos.identity.api.RoleCodes;
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

/**
 * Planning a project from the screen: milestones and tasks are added without saying where in the list they go, and land
 * in the order they were added. (A request that left out the position used to be refused as "Failed to read request".)
 */
class ProjectPlanningIT extends AbstractIntegrationTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    String manager;
    String projectId;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        manager = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        String customerId = as(manager).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
        projectId = as(manager).body(Map.of("title", "Rooftop solar", "customerId", customerId, "customerName", "Acme Solar",
                        "startDate", today.toString(), "expectedCompletionDate", today.plusDays(60).toString()))
                .post("/api/v1/projects").then().statusCode(lessThan(300)).extract().path("id");
    }

    @Test
    void milestonesAddedWithoutAPositionAreOrderedAsTheyWereAdded() {
        for (String title : new String[] {"Site survey", "Installation", "Hand-over"}) {
            as(manager).body(Map.of("title", title, "dueDate", today.plusDays(20).toString()))
                    .post("/api/v1/projects/" + projectId + "/milestones").then().statusCode(lessThan(300))
                    .body("title", equalTo(title));
        }
        as(manager).get("/api/v1/projects/" + projectId).then().statusCode(200)
                .body("milestones.title", contains("Site survey", "Installation", "Hand-over"))
                .body("milestones.displayOrder", contains(1, 2, 3));
    }

    @Test
    void tasksAddedWithoutAPositionAreOrderedAsTheyWereAdded() {
        for (String title : new String[] {"Measure the roof", "Order the panels"}) {
            as(manager).body(Map.of("title", title, "priority", "HIGH"))
                    .post("/api/v1/projects/" + projectId + "/tasks").then().statusCode(lessThan(300)).body("title", equalTo(title));
        }
        as(manager).get("/api/v1/projects/" + projectId).then().statusCode(200)
                .body("tasks.title", contains("Measure the roof", "Order the panels"))
                .body("tasks.displayOrder", contains(1, 2));
    }
}
