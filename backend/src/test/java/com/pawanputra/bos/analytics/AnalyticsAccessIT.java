package com.pawanputra.bos.analytics;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import io.restassured.RestAssured;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Who may open which dashboard, and what each of them is allowed to see on it, over real HTTP against the
 * real role grants. Opening a dashboard needs ANALYTICS_VIEW and the permission of the module it reads;
 * a part of a dashboard that needs yet another permission (money, commissions, orders) is left out, not hidden.
 *
 * <p>The default grants this relies on: FINANCE reads finance and projects; PROJECT_MANAGER projects, the
 * support desk and workforce; SALES_MANAGER sales, projects and workforce (and commissions); DIRECTOR everything.
 */
class AnalyticsAccessIT extends AbstractIntegrationTest {

    private static final String ANALYTICS = "/api/v1/analytics";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final List<String> DASHBOARDS =
            List.of("control-tower", "finance", "sales", "projects", "service", "workforce");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;
    @Autowired JdbcTemplate jdbc;

    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
    }

    private String signedInAs(String... roles) {
        return tokenFor(accounts.activeUser(roles));
    }

    private static void opens(String token, String... paths) {
        for (String path : paths) {
            as(token).get(ANALYTICS + "/" + path).then().statusCode(200);
        }
    }

    private static void refuses(String token, String... paths) {
        for (String path : paths) {
            as(token).get(ANALYTICS + "/" + path).then().statusCode(403).body("code", equalTo("FORBIDDEN"));
        }
    }

    // ------------------------------------------------------------------ who may open what

    @Test
    void everyDashboardNeedsASignIn() {
        for (String path : List.of("control-tower", "finance", "sales", "projects", "service", "workforce", "executive", "my-work")) {
            given().get(ANALYTICS + "/" + path).then().statusCode(401).body("code", equalTo("UNAUTHENTICATED"));
        }
        given().queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(401);
    }

    @Test
    void withoutAnalyticsViewNoDashboardOpensEvenWithTheModulePermission() {
        // A technician may see projects, contracts and the team, a sales executive leads and deals: not the dashboards.
        for (String role : List.of(RoleCodes.TECHNICIAN, RoleCodes.SALES_EXECUTIVE, RoleCodes.SUPPORT_AGENT, RoleCodes.HR)) {
            String token = signedInAs(role);
            refuses(token, "control-tower", "finance", "sales", "projects", "service", "workforce", "executive");
            as(token).queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(403);
        }
    }

    @Test
    void aDashboardAlsoNeedsThePermissionOfTheModuleItReads() {
        String finance = signedInAs(RoleCodes.FINANCE);
        opens(finance, "control-tower", "finance", "projects");
        refuses(finance, "sales", "service", "workforce", "executive");
        as(finance).queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(200);

        String projectManager = signedInAs(RoleCodes.PROJECT_MANAGER);
        opens(projectManager, "control-tower", "projects", "service", "workforce");
        refuses(projectManager, "finance", "sales", "executive");
        as(projectManager).queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(403);

        String salesManager = signedInAs(RoleCodes.SALES_MANAGER);
        opens(salesManager, "control-tower", "sales", "projects", "workforce");
        refuses(salesManager, "finance", "service", "executive");

        String director = signedInAs(RoleCodes.DIRECTOR);
        opens(director, "control-tower", "finance", "sales", "projects", "service", "workforce", "executive", "my-work");
        as(director).queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(200);
    }

    @Test
    void theControlTowerOnlyCarriesThePartsTheCallerMaySee() {
        as(signedInAs(RoleCodes.FINANCE)).get(ANALYTICS + "/control-tower").then().statusCode(200)
                .body("finance", notNullValue()).body("projects", notNullValue())
                .body("sales", nullValue()).body("service", nullValue());

        as(signedInAs(RoleCodes.PROJECT_MANAGER)).get(ANALYTICS + "/control-tower").then().statusCode(200)
                .body("projects", notNullValue()).body("service", notNullValue())
                .body("finance", nullValue()).body("sales", nullValue());

        as(signedInAs(RoleCodes.SALES_MANAGER)).get(ANALYTICS + "/control-tower").then().statusCode(200)
                .body("sales", notNullValue()).body("projects", notNullValue())
                .body("finance", nullValue()).body("service", nullValue());

        as(signedInAs(RoleCodes.DIRECTOR)).get(ANALYTICS + "/control-tower").then().statusCode(200)
                .body("finance", notNullValue()).body("sales", notNullValue())
                .body("projects", notNullValue()).body("service", notNullValue());
    }

    @Test
    void moneyOnTheProjectDashboardNeedsFinanceView() {
        as(signedInAs(RoleCodes.PROJECT_MANAGER)).get(ANALYTICS + "/projects").then().statusCode(200)
                .body("overview", notNullValue()).body("economics", nullValue());
        as(signedInAs(RoleCodes.FINANCE)).get(ANALYTICS + "/projects").then().statusCode(200)
                .body("overview", notNullValue()).body("economics", notNullValue());
    }

    @Test
    void commissionsOnTheWorkforceDashboardNeedCommissionView() {
        // A project manager sees the team's attendance, not what people earned; a sales manager sees both.
        as(signedInAs(RoleCodes.PROJECT_MANAGER)).get(ANALYTICS + "/workforce").then().statusCode(200)
                .body("topPerformers", nullValue());
        as(signedInAs(RoleCodes.SALES_MANAGER)).get(ANALYTICS + "/workforce").then().statusCode(200)
                .body("topPerformers", empty());
    }

    @Test
    void myWorkIsOpenToEveryoneButEachBlockFollowsTheModulePermission() {
        as(signedInAs(RoleCodes.SALES_EXECUTIVE)).get(ANALYTICS + "/my-work").then().statusCode(200)
                // Nobody has set this person a target, so there is no targets block rather than an empty one.
                .body("tasks", notNullValue()).body("targets", nullValue())
                .body("projectTasks", nullValue()).body("projects", nullValue()).body("jobs", nullValue())
                .body("tickets", nullValue()).body("collections", nullValue());

        as(signedInAs(RoleCodes.TECHNICIAN)).get(ANALYTICS + "/my-work").then().statusCode(200)
                .body("jobs", notNullValue()).body("projectTasks", notNullValue()).body("projects", notNullValue())
                .body("tasks", nullValue()).body("tickets", nullValue()).body("collections", nullValue());

        as(signedInAs(RoleCodes.FINANCE)).get(ANALYTICS + "/my-work").then().statusCode(200)
                .body("collections", notNullValue()).body("jobs", nullValue()).body("tickets", nullValue());
    }

    @Test
    void thePartsOfTheSalesDashboardFollowTheModulePermissionsTheyComeFrom() {
        // The default roles never hold only some of these, but roles can be made: each part must stand on its own permission.
        String leadsAndDeals = signedInAs(roleWith("ANALYTICS_VIEW", "LEAD_VIEW", "OPPORTUNITY_VIEW"));
        as(leadsAndDeals).get(ANALYTICS + "/sales").then().statusCode(200)
                .body("overview.leadFunnel", notNullValue()).body("overview.pipeline", notNullValue())
                .body("wonByVertical", notNullValue())
                .body("quotations", nullValue()).body("orders", nullValue());

        as(signedInAs(roleWith("ANALYTICS_VIEW", "LEAD_VIEW", "OPPORTUNITY_VIEW", "QUOTATION_VIEW")))
                .get(ANALYTICS + "/sales").then().statusCode(200)
                .body("quotations", notNullValue()).body("orders", nullValue());

        as(signedInAs(roleWith("ANALYTICS_VIEW", "LEAD_VIEW", "OPPORTUNITY_VIEW", "ORDER_VIEW")))
                .get(ANALYTICS + "/sales").then().statusCode(200)
                .body("quotations", nullValue()).body("orders", notNullValue());

        // Leads without deals, and deals without leads, each get their own half and none of the other.
        as(signedInAs(roleWith("ANALYTICS_VIEW", "LEAD_VIEW"))).get(ANALYTICS + "/sales").then().statusCode(200)
                .body("overview.leadFunnel", notNullValue()).body("overview.leadsCreated", notNullValue())
                .body("overview.pipeline", nullValue()).body("overview.won", nullValue())
                .body("overview.pipelineByStage", nullValue()).body("wonByVertical", nullValue());
        as(signedInAs(roleWith("ANALYTICS_VIEW", "OPPORTUNITY_VIEW"))).get(ANALYTICS + "/sales").then().statusCode(200)
                .body("overview.pipeline", notNullValue()).body("overview.won", notNullValue())
                .body("overview.leadFunnel", nullValue()).body("overview.leadsCreated", nullValue())
                .body("overview.leadWinRatePct", nullValue());
    }

    @Test
    void theServiceDashboardSplitsTicketsFromContracts() {
        as(signedInAs(roleWith("ANALYTICS_VIEW", "TICKET_VIEW"))).get(ANALYTICS + "/service").then().statusCode(200)
                .body("overview.openTickets", notNullValue()).body("overview.volume", notNullValue())
                .body("openByPriority", notNullValue()).body("agentLoad", notNullValue())
                .body("overview.amc", nullValue()).body("warrantiesExpiring90", nullValue());
        as(signedInAs(roleWith("ANALYTICS_VIEW", "AMC_VIEW"))).get(ANALYTICS + "/service").then().statusCode(200)
                .body("overview.amc", notNullValue())
                .body("overview.openTickets", nullValue()).body("overview.slaCompliancePct", nullValue())
                .body("overview.volume", nullValue())
                .body("openByPriority", nullValue()).body("agentLoad", nullValue()).body("warrantiesExpiring90", notNullValue());
    }

    /** A role of this test run that holds exactly the given permissions; returns its code. */
    private String roleWith(String... permissions) {
        String code = "T_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        jdbc.update("INSERT INTO roles (code, name, system_role, active, created_by, updated_by) VALUES (?, ?, false, true, 'test', 'test')",
                code, "Test role " + code);
        String marks = String.join(", ", Collections.nCopies(permissions.length, "?"));
        Object[] arguments = new Object[permissions.length + 1];
        arguments[0] = code;
        System.arraycopy(permissions, 0, arguments, 1, permissions.length);
        int granted = jdbc.update("INSERT INTO role_permissions (role_id, permission_id) "
                + "SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = ? AND p.code IN (" + marks + ")", arguments);
        assertThat(granted).as("permissions granted to %s", code).isEqualTo(permissions.length);
        return code;
    }

    // ------------------------------------------------------------------ the period

    @Test
    void thePeriodDefaultsToTheLastThirtyDaysEndingTodayInTheBusinessZone() {
        as(signedInAs(RoleCodes.DIRECTOR)).get(ANALYTICS + "/finance").then().statusCode(200)
                .body("period.from", equalTo(today.minusDays(29).toString()))
                .body("period.to", equalTo(today.toString()))
                .body("period.days", equalTo(30))
                .body("period.previousFrom", equalTo(today.minusDays(59).toString()))
                .body("period.previousTo", equalTo(today.minusDays(30).toString()))
                .body("period.asOf", equalTo(today.toString()))
                .body("period.granularity", equalTo("DAY"))
                .body("period.currency", equalTo("INR"))
                .body("overview.trend", hasSize(30));
    }

    @Test
    void aGivenPeriodIsHonouredAndComparedWithTheEquallyLongOneBefore() {
        String director = signedInAs(RoleCodes.DIRECTOR);

        as(director).queryParam("from", today.minusDays(9).toString()).queryParam("to", today.toString())
                .get(ANALYTICS + "/finance").then().statusCode(200)
                .body("period.days", equalTo(10))
                .body("period.previousFrom", equalTo(today.minusDays(19).toString()))
                .body("period.previousTo", equalTo(today.minusDays(10).toString()))
                .body("overview.trend", hasSize(10));

        // A year is read per month, so a chart of it has a dozen points, not three hundred and sixty-five.
        as(director).queryParam("from", today.minusDays(364).toString()).queryParam("to", today.toString())
                .get(ANALYTICS + "/finance").then().statusCode(200)
                .body("period.granularity", equalTo("MONTH"));
    }

    @Test
    void aNonsensicalPeriodIsRefusedWithAReadableReason() {
        String director = signedInAs(RoleCodes.DIRECTOR);

        as(director).queryParam("from", today.toString()).queryParam("to", today.minusDays(1).toString())
                .get(ANALYTICS + "/finance").then().statusCode(400)
                .body("code", equalTo("VALIDATION_FAILED")).body("detail", equalTo("'to' must not be before 'from'"));
        as(director).queryParam("from", today.minusDays(900).toString()).queryParam("to", today.toString())
                .get(ANALYTICS + "/projects").then().statusCode(400).body("code", equalTo("VALIDATION_FAILED"));
        as(director).queryParam("from", "last-tuesday").get(ANALYTICS + "/sales").then().statusCode(400);
    }

    // ------------------------------------------------------------------ nothing is made up

    @Test
    void anOrganizationWithNoRecordsGetsZerosForTotalsAndNullForWhatCannotBeWorkedOut() {
        String director = signedInAs(RoleCodes.DIRECTOR);

        as(director).get(ANALYTICS + "/finance").then().statusCode(200)
                .body("overview.invoiced.value", equalTo(0.0f)).body("overview.collected.value", equalTo(0.0f))
                .body("overview.outstanding.amount", equalTo(0.0f)).body("overview.outstanding.invoices", equalTo(0))
                .body("overview.collectionRatePct", nullValue()).body("dsoDays", nullValue())
                .body("overview.ageing", hasSize(5)).body("overview.ageing.amount", everyItem(equalTo(0.0f)))
                .body("topDebtors", empty()).body("collectedByMethod", empty())
                .body("projectEconomics.projects", equalTo(0)).body("projectEconomics.marginPct", nullValue());

        as(director).get(ANALYTICS + "/sales").then().statusCode(200)
                .body("overview.leadWinRatePct", nullValue()).body("overview.leadFunnel.count", everyItem(equalTo(0)))
                .body("overview.pipeline.amount", equalTo(0.0f)).body("overview.pipeline.deals", equalTo(0))
                .body("orders.count", equalTo(0)).body("orders.averageValue", nullValue());

        as(director).get(ANALYTICS + "/projects").then().statusCode(200)
                .body("overview.active", equalTo(0)).body("overview.delayed", equalTo(0))
                .body("overview.onTimePct", nullValue()).body("overview.avgDurationDays", nullValue())
                .body("overview.byStatus", empty()).body("costComparison", empty());

        as(director).get(ANALYTICS + "/service").then().statusCode(200)
                .body("overview.openTickets", equalTo(0)).body("overview.slaCompliancePct", nullValue())
                .body("overview.avgResolutionHours", nullValue()).body("overview.amc.active", equalTo(0));

        as(director).get(ANALYTICS + "/workforce").then().statusCode(200)
                .body("totalEmployees", equalTo(0)).body("avgAttendanceRate", nullValue());
    }
}
