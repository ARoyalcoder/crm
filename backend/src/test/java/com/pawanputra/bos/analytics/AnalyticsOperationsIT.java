package com.pawanputra.bos.analytics;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/**
 * Projects, the support desk and sales on their dashboards, from rows written straight into the tables so every
 * figure can be worked out by hand (the comments say how). Whether a project is finished comes from the
 * organization's project statuses; a brand-new organization has none yet, which is the case the dashboards must
 * handle from the first day.
 */
class AnalyticsOperationsIT extends AbstractIntegrationTest {

    private static final String ANALYTICS = "/api/v1/analytics";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;
    @Autowired NamedParameterJdbcTemplate jdbc;

    LocalDate today;
    Account account;
    UUID org;
    String director;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
        account = accounts.activeUser(RoleCodes.ADMIN);
        org = account.organizationId();
        director = tokenFor(accounts.activeColleagueOf(account, RoleCodes.DIRECTOR));
    }

    /** Noon, in the business time zone, this many days ago: far from any midnight, so the day it falls on is unambiguous. */
    private OffsetDateTime at(int daysAgo) {
        return today.minusDays(daysAgo).atTime(12, 0).atZone(BUSINESS_ZONE).toOffsetDateTime();
    }

    private MapSqlParameterSource row() {
        return new MapSqlParameterSource("org", org).addValue("user", account.id());
    }

    // ================================================================== projects

    private void project(String number, String status, int startedDaysAgo, int dueDaysAgo, Integer doneDaysAgo,
            int budget, int revenue, int cost, Integer expectedCost, Integer material, Integer labour, int progress, boolean deleted) {
        jdbc.update("INSERT INTO projects (organization_id, project_number, title, customer_id, customer_name, project_manager_id, project_manager_name, "
                        + "start_date, expected_completion_date, actual_completion_date, status, budget, revenue, cost, progress_percentage, "
                        + "expected_cost, material_cost, labour_cost, created_by, updated_by, deleted_at) "
                        + "VALUES (:org, :number, :title, :customer, 'Acme Solar', :user, 'Test User', :start, :due, :done, :status, :budget, :revenue, :cost, :progress, "
                        + ":expectedCost, :material, :labour, 'test', 'test', :deleted)",
                row().addValue("number", number).addValue("title", "Project " + number).addValue("customer", UUID.randomUUID())
                        .addValue("start", today.minusDays(startedDaysAgo)).addValue("due", today.minusDays(dueDaysAgo))
                        .addValue("done", doneDaysAgo == null ? null : today.minusDays(doneDaysAgo)).addValue("status", status)
                        .addValue("budget", budget).addValue("revenue", revenue).addValue("cost", cost).addValue("progress", progress)
                        .addValue("expectedCost", expectedCost == null ? 0 : expectedCost).addValue("material", material == null ? 0 : material).addValue("labour", labour == null ? 0 : labour)
                        .addValue("deleted", deleted ? OffsetDateTime.now() : null));
    }

    private void someProjects() {
        // P-1: done 5 days ago, due 3 days ago (on time), 20 days long; costs itemised: 30,000 + 20,000.
        project("P-1", "COMPLETED", 25, 3, 5, 0, 100_000, 0, 40_000, 30_000, 20_000, 100, false);
        // P-2: done 2 days ago, due 10 days ago (8 days late), 30 days long; one cost figure of 60,000, budget 45,000.
        project("P-2", "COMPLETED", 32, 10, 2, 45_000, 50_000, 60_000, null, null, null, 100, false);
        // P-3: still running, due 7 days ago: delayed by 7 days, 40% done; budget 70,000, cost so far 10,000.
        project("P-3", "IN_PROGRESS", 60, 7, null, 70_000, 80_000, 10_000, null, null, null, 40, false);
        // P-4: running and on schedule (due in 20 days).
        project("P-4", "IN_PROGRESS", 5, -20, null, 20_000, 0, 0, null, null, null, 10, false);
        // P-5 was cancelled long ago and P-6 deleted: neither is running, late or counted.
        project("P-5", "CANCELLED", 90, 30, null, 5_000, 0, 0, null, null, null, 0, false);
        project("P-6", "IN_PROGRESS", 50, 20, null, 9_000, 0, 0, null, null, null, 0, true);
    }

    @Test
    void theProjectDashboardCountsWhatIsRunningLateAndDoneFromTheProjectsThemselves() {
        someProjects();

        Response response = as(director).get(ANALYTICS + "/projects");
        response.then().statusCode(200)
                .body("overview.active", equalTo(2)).body("overview.delayed", equalTo(1))
                .body("overview.completed.value", equalTo(2)).body("overview.completed.previous", equalTo(0))
                // One of the two finished by its date.
                .body("overview.onTimePct", equalTo(50.0f))
                // (20 + 30) / 2 days from start to finish.
                .body("overview.avgDurationDays", equalTo(25.0f))
                .body("overview.byStatus.code", contains("IN_PROGRESS", "COMPLETED", "CANCELLED"))
                .body("overview.byStatus.name", contains("In Progress", "Completed", "Cancelled"))
                .body("overview.byStatus.count", contains(2, 2, 1))
                .body("overview.byStatus.terminal", contains(false, true, true))
                .body("overview.delayedProjects", hasSize(1))
                .body("overview.delayedProjects[0].number", equalTo("P-3"))
                .body("overview.delayedProjects[0].daysLate", equalTo(7))
                .body("overview.delayedProjects[0].progressPct", equalTo(40))
                .body("overview.delayedProjects[0].manager", equalTo("Test User"));

        // Expected cost is the expected cost, else the budget; recorded is the itemised costs, else the single cost figure.
        // Running projects and those finished in the period, biggest expected first: P-3, P-2, P-1, P-4.
        response.then()
                .body("costComparison.number", contains("P-3", "P-2", "P-1", "P-4"))
                .body("costComparison.expectedCost", contains(70000.0f, 45000.0f, 40000.0f, 20000.0f))
                .body("costComparison.recordedCost", contains(10000.0f, 60000.0f, 50000.0f, 0.0f))
                .body("expectedCostTotal", equalTo(175000.0f)).body("recordedCostTotal", equalTo(120000.0f));

        // Each completion is on the chart on the day it happened, in the column it belongs to.
        response.then()
                .body("deliveryTrend", hasSize(30))
                .body("deliveryTrend.find { it.bucket == '" + today.minusDays(5) + "' }.onTime", equalTo(1))
                .body("deliveryTrend.find { it.bucket == '" + today.minusDays(5) + "' }.late", equalTo(0))
                .body("deliveryTrend.find { it.bucket == '" + today.minusDays(2) + "' }.onTime", equalTo(0))
                .body("deliveryTrend.find { it.bucket == '" + today.minusDays(2) + "' }.late", equalTo(1));
    }

    @Test
    void projectEconomicsAreRecordedCostsNotAProfitAndLoss() {
        someProjects();

        as(director).get(ANALYTICS + "/projects").then().statusCode(200)
                .body("economics.projects", equalTo(2))
                .body("economics.revenue", equalTo(150000.0f))
                .body("economics.recordedCost", equalTo(110000.0f))
                .body("economics.margin", equalTo(40000.0f))
                .body("economics.marginPct", equalTo(26.7f))
                .body("economics.material", equalTo(30000.0f)).body("economics.labour", equalTo(20000.0f))
                .body("economics.vendor", equalTo(0.0f)).body("economics.travel", equalTo(0.0f)).body("economics.other", equalTo(0.0f))
                // P-2 has one cost figure and no breakdown: it is in the total, and said so, instead of vanishing from the chart.
                .body("economics.notItemised", equalTo(60000.0f))
                .body("economics.byVertical", hasSize(1)).body("economics.byVertical[0].projects", equalTo(2));

        // The finance dashboard shows the same projects the same way.
        as(director).get(ANALYTICS + "/finance").then().statusCode(200)
                .body("projectEconomics.recordedCost", equalTo(110000.0f)).body("projectEconomics.marginPct", equalTo(26.7f));
    }

    @Test
    void aProjectIsFinishedAccordingToTheOrganizationsOwnStatusFlags() {
        // The organization has renamed its flow: "HANDED_OVER" is its finished status. Names mean nothing; the flag does.
        jdbc.update("INSERT INTO project_statuses (organization_id, code, name, display_order, is_completed, is_cancelled, created_by, updated_by) "
                        + "VALUES (:org, 'HANDED_OVER', 'Handed over', 9, true, false, 'test', 'test')", row());
        project("P-7", "HANDED_OVER", 30, 5, 3, 10_000, 20_000, 5_000, null, null, null, 100, false);
        project("P-8", "IN_PROGRESS", 10, -5, null, 10_000, 0, 0, null, null, null, 20, false);

        as(director).get(ANALYTICS + "/projects").then().statusCode(200)
                .body("overview.active", equalTo(1)).body("overview.completed.value", equalTo(1))
                .body("overview.byStatus.find { it.code == 'HANDED_OVER' }.name", equalTo("Handed over"))
                .body("overview.byStatus.find { it.code == 'HANDED_OVER' }.terminal", equalTo(true));
    }

    // ================================================================== the support desk

    private void ticket(String status, String priority, int openedDaysAgo, Integer resolvedDaysAgo, OffsetDateTime due, boolean assigned) {
        jdbc.update("INSERT INTO tickets (organization_id, ticket_number, customer_name, subject, priority, status, assigned_user_id, assigned_user_name, "
                        + "due_at, resolved_at, created_at, created_by, updated_by) "
                        + "VALUES (:org, :number, 'Acme Solar', 'Camera offline', :priority, :status, :assignee, :assigneeName, :due, :resolved, :opened, 'test', 'test')",
                row().addValue("number", "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))
                        .addValue("priority", priority).addValue("status", status)
                        .addValue("assignee", assigned ? account.id() : null).addValue("assigneeName", assigned ? "Test User" : null)
                        .addValue("due", due).addValue("resolved", resolvedDaysAgo == null ? null : at(resolvedDaysAgo))
                        .addValue("opened", at(openedDaysAgo)));
    }

    @Test
    void theServiceDashboardCountsTicketsAndSlaFromTheTicketsThemselves() {
        // Resolved a day before it was due: within SLA. Took 24 hours.
        ticket("RESOLVED", "HIGH", 3, 2, at(1), true);
        // Due 8 days ago, resolved 5 days ago: breached its SLA. Took 120 hours.
        ticket("RESOLVED", "MEDIUM", 10, 5, at(8), true);
        // Closed with no due time: counts as resolved and in the average, but not for or against the SLA. 24 hours.
        ticket("CLOSED", "LOW", 4, 3, null, true);
        // Open and already past its due time: a breach in progress.
        ticket("OPEN", "CRITICAL", 2, null, at(1), true);
        // Open, not due for two more days, nobody on it.
        ticket("IN_PROGRESS", "LOW", 1, null, today.plusDays(2).atTime(12, 0).atZone(BUSINESS_ZONE).toOffsetDateTime(), false);
        // From the period before this one: opened 40 days ago, resolved 35 days ago.
        ticket("RESOLVED", "MEDIUM", 40, 35, null, true);

        Response response = as(director).get(ANALYTICS + "/service");
        response.then().statusCode(200)
                .body("overview.openTickets", equalTo(2)).body("overview.breachedOpen", equalTo(1))
                .body("overview.opened.value", equalTo(5)).body("overview.opened.previous", equalTo(1))
                .body("overview.resolved.value", equalTo(3)).body("overview.resolved.previous", equalTo(1))
                // (24 + 120 + 24) / 3 hours; of the two resolved tickets that had a due time, one was in time.
                .body("overview.avgResolutionHours", equalTo(56.0f))
                .body("overview.slaCompliancePct", equalTo(50.0f))
                .body("overview.volume", hasSize(30))
                .body("overview.volume.find { it.bucket == '" + today.minusDays(3) + "' }.opened", equalTo(1))
                .body("overview.volume.find { it.bucket == '" + today.minusDays(5) + "' }.resolved", equalTo(1))
                .body("openByPriority.priority", contains("CRITICAL", "LOW"))
                .body("openByPriority.open", contains(1, 1)).body("openByPriority.breached", contains(1, 0))
                .body("agentLoad.name", containsInAnyOrder("Test User", "Unassigned"));

        List<Integer> opened = response.path("overview.volume.opened");
        List<Integer> resolved = response.path("overview.volume.resolved");
        assertThat(opened.stream().mapToInt(Integer::intValue).sum()).isEqualTo(5);
        assertThat(resolved.stream().mapToInt(Integer::intValue).sum()).isEqualTo(3);
    }

    @Test
    void theSupportDeskOfAnotherOrganizationIsNotCounted() {
        ticket("OPEN", "HIGH", 1, null, at(1), true);
        Account other = accounts.activeUser(RoleCodes.DIRECTOR);

        as(tokenFor(other)).get(ANALYTICS + "/service").then().statusCode(200)
                .body("overview.openTickets", equalTo(0)).body("overview.breachedOpen", equalTo(0))
                .body("overview.opened.value", equalTo(0)).body("openByPriority", hasSize(0));
    }

    // ================================================================== sales

    private UUID stage(UUID pipeline, String name, int order, int probability, boolean won, boolean lost) {
        return jdbc.queryForObject("INSERT INTO pipeline_stages (pipeline_id, name, code, display_order, default_probability, is_won, is_lost, created_by, updated_by) "
                        + "VALUES (:pipeline, :name, upper(:name), :order, :probability, :won, :lost, 'test', 'test') RETURNING id",
                new MapSqlParameterSource("pipeline", pipeline).addValue("name", name).addValue("order", order)
                        .addValue("probability", probability).addValue("won", won).addValue("lost", lost), UUID.class);
    }

    private void lead(String number, String status, String qualification, int createdDaysAgo, boolean closed, boolean worked, boolean deleted) {
        UUID id = jdbc.queryForObject("INSERT INTO leads (organization_id, lead_number, contact_name, phone, service_id, status, closed_at, qualification_status, "
                        + "created_at, created_by, updated_by, deleted_at) "
                        + "VALUES (:org, :number, 'Asha Rao', '9876543210', :service, :status, :closedAt, :qualification, :created, 'test', 'test', :deleted) RETURNING id",
                row().addValue("number", number).addValue("service", UUID.randomUUID()).addValue("status", status)
                        .addValue("closedAt", closed ? at(1) : null).addValue("qualification", qualification)
                        .addValue("created", at(createdDaysAgo)).addValue("deleted", deleted ? OffsetDateTime.now() : null), UUID.class);
        if (worked) {
            jdbc.update("INSERT INTO lead_activities (lead_id, type, occurred_at, subject, logged_by_name, created_by, updated_by) "
                    + "VALUES (:lead, 'CALL', :at, 'Intro call', 'Test User', 'test', 'test')", new MapSqlParameterSource("lead", id).addValue("at", at(1)));
        }
    }

    private void deal(UUID pipeline, UUID stage, String status, int value, int probability, Integer closedDaysAgo, String vertical, boolean deleted) {
        jdbc.update("INSERT INTO opportunities (organization_id, title, value, probability, owner_id, owner_name, pipeline_id, stage_id, status, won_at, lost_at, "
                        + "vertical_code, created_by, updated_by, deleted_at) "
                        + "VALUES (:org, 'Deal', :value, :probability, :user, 'Test User', :pipeline, :stage, :status, :wonAt, :lostAt, :vertical, 'test', 'test', :deleted)",
                row().addValue("value", value).addValue("probability", probability).addValue("pipeline", pipeline).addValue("stage", stage)
                        .addValue("status", status).addValue("wonAt", "WON".equals(status) ? at(closedDaysAgo) : null)
                        .addValue("lostAt", "LOST".equals(status) ? at(closedDaysAgo) : null).addValue("vertical", vertical)
                        .addValue("deleted", deleted ? OffsetDateTime.now() : null));
    }

    @Test
    void theSalesDashboardFollowsLeadsThroughTheFunnelAndDealsThroughThePipeline() {
        // Leads created in the period: 1 untouched, 1 being qualified, 1 qualified, 1 won, 1 lost, 1 with a call logged.
        lead("L-1", "OPEN", "NOT_STARTED", 1, false, false, false);
        lead("L-2", "OPEN", "IN_PROGRESS", 1, false, false, false);
        lead("L-3", "OPEN", "QUALIFIED", 1, false, false, false);
        lead("L-4", "WON", "QUALIFIED", 1, true, false, false);
        lead("L-5", "LOST", "NOT_STARTED", 1, true, false, false);
        lead("L-6", "OPEN", "NOT_STARTED", 1, false, true, false);
        lead("L-7", "OPEN", "NOT_STARTED", 40, false, false, false); // the period before
        lead("L-8", "OPEN", "NOT_STARTED", 1, false, false, true);   // deleted

        UUID pipeline = jdbc.queryForObject("INSERT INTO pipelines (organization_id, name, code, is_default, active, created_by, updated_by) "
                + "VALUES (:org, 'Sales', 'SALES', true, true, 'test', 'test') RETURNING id", row(), UUID.class);
        UUID discovery = stage(pipeline, "Discovery", 1, 20, false, false);
        UUID proposal = stage(pipeline, "Proposal", 2, 50, false, false);
        UUID won = stage(pipeline, "Won", 3, 100, true, false);
        UUID lost = stage(pipeline, "Lost", 4, 0, false, true);
        deal(pipeline, discovery, "OPEN", 100_000, 20, null, null, false);
        deal(pipeline, proposal, "OPEN", 200_000, 50, null, null, false);
        deal(pipeline, won, "WON", 300_000, 100, 2, "IT_SUPPORT", false);
        deal(pipeline, won, "WON", 50_000, 100, 40, "SOLAR", false);       // won in the period before
        deal(pipeline, lost, "LOST", 10_000, 0, 3, null, false);
        deal(pipeline, discovery, "OPEN", 999_999, 20, null, null, true);  // deleted

        as(director).get(ANALYTICS + "/sales").then().statusCode(200)
                // Each stage of the funnel contains the ones after it, so it can only narrow: 6 created, 5 worked, 2 qualified, 1 won.
                .body("overview.leadFunnel.key", contains("CREATED", "ENGAGED", "QUALIFIED", "WON"))
                .body("overview.leadFunnel.count", contains(6, 5, 2, 1))
                .body("overview.leadsCreated.value", equalTo(6)).body("overview.leadsCreated.previous", equalTo(1))
                // Of the leads closed in the period, one was won and one lost.
                .body("overview.leadWinRatePct", equalTo(50.0f)).body("overview.leadsLost", equalTo(1))
                // 100,000 + 200,000 open; weighted by each deal's own probability: 20,000 + 100,000.
                .body("overview.pipeline.amount", equalTo(300000.0f)).body("overview.pipeline.deals", equalTo(2))
                .body("overview.weightedPipeline", equalTo(120000.0f))
                .body("overview.won.value", equalTo(300000.0f)).body("overview.won.previous", equalTo(50000.0f))
                .body("overview.wonCount.value", equalTo(1)).body("overview.wonCount.previous", equalTo(1))
                .body("overview.pipelineByStage.stage", contains("Discovery", "Proposal"))
                .body("overview.pipelineByStage.opportunities", contains(1, 1))
                .body("overview.pipelineByStage.amount", contains(100000.0f, 200000.0f))
                // Won by vertical: all six verticals are always there (so each keeps its place on a chart); only IT support has a win.
                .body("wonByVertical", hasSize(6))
                .body("wonByVertical.find { it.code == 'IT_SUPPORT' }.amount", equalTo(300000.0f))
                .body("wonByVertical.find { it.code == 'SOLAR' }.amount", equalTo(0.0f))
                .body("orders.count", equalTo(0))
                .body("orders.topSalespeople[0].name", equalTo("Test User")).body("orders.topSalespeople[0].wonDeals", equalTo(1));
    }

    @Test
    void theControlTowerShowsTheSameSalesNumbersAsTheSalesDashboard() {
        lead("L-1", "OPEN", "NOT_STARTED", 1, false, false, false);
        UUID pipeline = jdbc.queryForObject("INSERT INTO pipelines (organization_id, name, code, is_default, active, created_by, updated_by) "
                + "VALUES (:org, 'Sales', 'SALES', true, true, 'test', 'test') RETURNING id", row(), UUID.class);
        deal(pipeline, stage(pipeline, "Discovery", 1, 20, false, false), "OPEN", 123_456, 20, null, null, false);
        project("P-3", "IN_PROGRESS", 60, 7, null, 70_000, 80_000, 10_000, null, null, null, 40, false);
        ticket("OPEN", "HIGH", 1, null, at(1), true);

        Response tower = as(director).get(ANALYTICS + "/control-tower");
        Response sales = as(director).get(ANALYTICS + "/sales");
        Response projects = as(director).get(ANALYTICS + "/projects");
        Response service = as(director).get(ANALYTICS + "/service");

        assertThat(tower.<Object>path("sales.pipeline.amount")).isEqualTo(sales.<Object>path("overview.pipeline.amount"));
        assertThat(tower.<Object>path("sales.leadFunnel.count")).isEqualTo(sales.<Object>path("overview.leadFunnel.count"));
        assertThat(tower.<Object>path("projects.delayed")).isEqualTo(projects.<Object>path("overview.delayed"));
        assertThat(tower.<Object>path("projects.active")).isEqualTo(projects.<Object>path("overview.active"));
        assertThat(tower.<Object>path("service.openTickets")).isEqualTo(service.<Object>path("overview.openTickets"));
        assertThat(tower.<Object>path("service.breachedOpen")).isEqualTo(service.<Object>path("overview.breachedOpen"));
        assertThat(tower.<Float>path("sales.pipeline.amount")).isCloseTo(123456.0f, within(0.01f));
    }
}
