package com.pawanputra.bos.servicecontract;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

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
 * Screens that used to show bare ids: AMC contracts and warranties name their customer (and the contract its project,
 * service and employee), and an employee profile names the person it belongs to. A form can also ask which users
 * still have no employee profile, so nobody has to paste a user id.
 */
class ContractsAndTeamNamesIT extends AbstractIntegrationTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    Account adminAccount;
    String admin;
    String customerId;
    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        adminAccount = accounts.activeUser(RoleCodes.ADMIN);
        admin = tokenFor(adminAccount);
        customerId = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
    }

    @Test
    void anAmcContractNamesItsCustomerInTheListAndTheDetail() {
        String contractId = as(admin).body(Map.of("customerId", customerId, "contractValue", 120000, "startDate", today.toString(),
                        "endDate", today.plusYears(1).toString(), "frequency", "QUARTERLY"))
                .post("/api/v1/amc-contracts").then().statusCode(201)
                .body("customerName", equalTo("Acme Solar"))
                .body("projectTitle", nullValue()).body("serviceName", nullValue()).body("assignedEmployeeName", nullValue())
                .extract().path("id");

        as(admin).get("/api/v1/amc-contracts").then().statusCode(200)
                .body("items.id", hasItem(contractId))
                .body("items[0].customerName", equalTo("Acme Solar"));
        as(admin).get("/api/v1/amc-contracts/" + contractId).then().statusCode(200).body("customerName", equalTo("Acme Solar"));
        as(admin).get("/api/v1/amc-contracts/dashboard").then().statusCode(200);
    }

    @Test
    void aWarrantyNamesItsCustomer() {
        String id = as(admin).body(Map.of("customerId", customerId, "description", "Two years on all cameras",
                        "startDate", today.toString(), "endDate", today.plusYears(2).toString()))
                .post("/api/v1/warranties").then().statusCode(201).body("customerName", equalTo("Acme Solar")).extract().path("id");

        as(admin).get("/api/v1/warranties").then().statusCode(200).body("items[0].customerName", equalTo("Acme Solar"));
        as(admin).get("/api/v1/warranties/" + id).then().statusCode(200).body("customerName", equalTo("Acme Solar"));
        as(admin).get("/api/v1/warranties/by-customer/" + customerId).then().statusCode(200)
                .body("warranties[0].customerName", equalTo("Acme Solar"));
    }

    @Test
    void anEmployeeProfileNamesThePersonAndTheFormListsUsersWhoStillNeedOne() {
        Account colleague = accounts.activeColleagueOf(adminAccount, RoleCodes.TECHNICIAN);

        // Nobody has a profile yet: both users can be given one, listed by name.
        as(admin).get("/api/v1/employees/available-users").then().statusCode(200)
                .body("userId", hasItem(colleague.id().toString())).body("fullName", hasItem("Test User"));

        String profile = as(admin).body(Map.of("userId", colleague.id().toString(), "department", "OPERATIONS", "designation", "Field technician"))
                .post("/api/v1/employees").then().statusCode(201)
                .body("fullName", equalTo("Test User")).body("email", equalTo(colleague.email()))
                .extract().path("id");

        as(admin).get("/api/v1/employees").then().statusCode(200)
                .body("id", contains(profile)).body("[0].fullName", equalTo("Test User"));
        as(admin).get("/api/v1/employees/" + profile).then().statusCode(200).body("fullName", equalTo("Test User"));
        // Once someone has a profile they are no longer on the list for the form.
        as(admin).get("/api/v1/employees/available-users").then().statusCode(200)
                .body("userId", not(hasItem(colleague.id().toString())));
    }

    @Test
    void thePeopleListIsOnlyForThoseWhoMayAddEmployees() {
        String technician = tokenFor(accounts.activeColleagueOf(adminAccount, RoleCodes.TECHNICIAN));
        as(technician).get("/api/v1/employees/available-users").then().statusCode(403);
        // Another organization's users never appear.
        String outsider = tokenFor(accounts.activeUser(RoleCodes.ADMIN));
        as(outsider).get("/api/v1/employees").then().statusCode(200).body("$", empty());
    }
}
