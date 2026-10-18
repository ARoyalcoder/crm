package com.pawanputra.bos.servicecontract;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * Service visits on an AMC contract: they are scheduled, then completed with an outcome, by people who may manage
 * contracts and only for contracts of their own organization.
 */
class AmcVisitsIT extends AbstractIntegrationTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    Account adminAccount;
    String admin;
    String customerId;
    String contractId;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        adminAccount = accounts.activeUser(RoleCodes.ADMIN);
        admin = tokenFor(adminAccount);
        customerId = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
        contractId = as(admin).body(Map.of("customerId", customerId, "contractValue", 90000, "startDate", today.toString(),
                        "endDate", today.plusYears(1).toString(), "frequency", "QUARTERLY"))
                .post("/api/v1/amc-contracts").then().statusCode(201).extract().path("id");
    }

    private String scheduleVisit() {
        return as(admin).body(Map.of("scheduledDate", today.plusDays(7).toString(), "visitType", "INSPECTION", "notes", "Check every camera"))
                .post("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(201)
                .body("status", equalTo("SCHEDULED")).body("visitType", equalTo("INSPECTION"))
                .extract().path("id");
    }

    @Test
    void aVisitIsScheduledAndThenCompletedWithItsOutcome() {
        String visit = scheduleVisit();

        as(admin).get("/api/v1/amc-contracts/" + contractId).then().statusCode(200).body("visits.id", contains(visit));

        as(admin).body(Map.of("status", "COMPLETED", "completedDate", today.toString(), "outcome", "  All eight cameras checked  "))
                .put("/api/v1/amc-service-visits/" + visit).then().statusCode(200)
                .body("status", equalTo("COMPLETED"))
                .body("completedDate", equalTo(today.toString()))
                .body("outcome", equalTo("All eight cameras checked"));
    }

    @Test
    void aVisitNamesWhoIsGoingAndWhichContractAndCustomerItIsFor() {
        Account colleague = accounts.activeColleagueOf(adminAccount, RoleCodes.TECHNICIAN);
        String employeeId = as(admin).body(Map.of("userId", colleague.id().toString(), "department", "OPERATIONS", "designation", "Field technician"))
                .post("/api/v1/employees").then().statusCode(201).extract().path("id");

        as(admin).body(Map.of("scheduledDate", today.plusDays(3).toString(), "assignedEmployeeId", employeeId))
                .post("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(201)
                .body("assignedEmployeeName", equalTo("Test User"))
                .body("customerName", equalTo("Acme Solar"))
                .body("contractNumber", startsWith("AMC-"));

        // The contract page and the overview list the same names.
        as(admin).get("/api/v1/amc-contracts/" + contractId).then().statusCode(200)
                .body("visits[0].assignedEmployeeName", equalTo("Test User"));
        // A new contract is a draft; the overview only looks at contracts in force.
        as(admin).get("/api/v1/amc-contracts/dashboard").then().statusCode(200).body("upcomingVisitsList", empty());
        as(admin).body(Map.of("customerId", customerId, "contractValue", 90000, "startDate", today.toString(),
                        "endDate", today.plusYears(1).toString(), "frequency", "QUARTERLY", "status", "ACTIVE"))
                .put("/api/v1/amc-contracts/" + contractId).then().statusCode(200).body("status", equalTo("ACTIVE"));
        as(admin).get("/api/v1/amc-contracts/dashboard").then().statusCode(200)
                .body("upcomingVisitsList[0].customerName", equalTo("Acme Solar"))
                .body("upcomingVisitsList[0].assignedEmployeeName", equalTo("Test User"));
    }

    @Test
    void aVisitWithoutADateIsRefused() {
        as(admin).body(Map.of("visitType", "SCHEDULED")).post("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(400);
    }

    @Test
    void anotherOrganizationCannotScheduleOrChangeVisitsOfThisContract() {
        String visit = scheduleVisit();
        String outsider = tokenFor(accounts.activeUser(RoleCodes.ADMIN));

        as(outsider).body(Map.of("status", "CANCELLED")).put("/api/v1/amc-service-visits/" + visit).then().statusCode(404);
        as(outsider).body(Map.of("scheduledDate", today.plusDays(1).toString()))
                .post("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(404);

        // Nothing changed for the owner.
        as(admin).get("/api/v1/amc-contracts/" + contractId).then().statusCode(200)
                .body("visits.size()", equalTo(1))
                .body("visits[0].status", equalTo("SCHEDULED"))
                .body("visits[0].completedDate", nullValue());
    }

    @Test
    void aTechnicianCanSeeVisitsButNotChangeThem() {
        String visit = scheduleVisit();
        String technician = tokenFor(accounts.activeColleagueOf(adminAccount, RoleCodes.TECHNICIAN));

        as(technician).get("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(200);
        as(technician).body(Map.of("status", "COMPLETED")).put("/api/v1/amc-service-visits/" + visit).then().statusCode(403);
        as(technician).body(Map.of("scheduledDate", today.plusDays(2).toString()))
                .post("/api/v1/amc-contracts/" + contractId + "/visits").then().statusCode(403);
    }
}
