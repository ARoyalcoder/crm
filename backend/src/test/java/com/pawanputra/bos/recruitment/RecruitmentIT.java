package com.pawanputra.bos.recruitment;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * Hiring: job openings, the people who apply, how far each application has got and the interviews along the way.
 * Lists say who and what by name, only people who manage recruitment can change it, and one organization never
 * sees another's candidates.
 */
class RecruitmentIT extends AbstractIntegrationTest {

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    Account hrAccount;
    String hr;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        hrAccount = accounts.activeUser(RoleCodes.HR);
        hr = tokenFor(hrAccount);
    }

    private String job(String title) {
        return as(hr).body(Map.of("title", title, "department", "Sales", "description", "Sell and install cameras", "status", "OPEN"))
                .post("/api/v1/jobs").then().statusCode(201).extract().path("id");
    }

    private String candidate(String firstName, String lastName, String email) {
        return as(hr).body(Map.of("firstName", firstName, "lastName", lastName, "email", email))
                .post("/api/v1/candidates").then().statusCode(201).extract().path("id");
    }

    private String apply(String jobId, String candidateId) {
        return as(hr).body(Map.of("jobId", jobId, "candidateId", candidateId))
                .post("/api/v1/applications").then().statusCode(201).extract().path("id");
    }

    @Test
    void aJobListsHowManyPeopleHaveAppliedToIt() {
        String busy = job("Sales executive");
        String quiet = job("Site supervisor");
        apply(busy, candidate("Asha", "Verma", "asha@example.com"));
        apply(busy, candidate("Rohit", "Nair", "rohit@example.com"));

        as(hr).get("/api/v1/jobs").then().statusCode(200)
                .body("find { it.id == '" + busy + "' }.applicationCount", equalTo(2))
                .body("find { it.id == '" + quiet + "' }.applicationCount", equalTo(0));
        as(hr).get("/api/v1/jobs/" + busy).then().statusCode(200).body("applicationCount", equalTo(2));
    }

    @Test
    void anApplicationNamesTheCandidateTheJobAndWhoLooksAfterIt() {
        String jobId = job("Sales executive");
        String candidateId = candidate("Asha", "Verma", "asha@example.com");
        Account colleague = accounts.activeColleagueOf(hrAccount, RoleCodes.SALES_MANAGER);

        as(hr).body(Map.of("jobId", jobId, "candidateId", candidateId, "assignedToUserId", colleague.id().toString()))
                .post("/api/v1/applications").then().statusCode(201)
                .body("candidateName", equalTo("Asha Verma"))
                .body("jobTitle", equalTo("Sales executive"))
                .body("assignedToName", equalTo("Test User"))
                .body("stage", equalTo("APPLIED"));

        as(hr).get("/api/v1/jobs/" + jobId + "/applications").then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].candidateName", equalTo("Asha Verma"))
                .body("[0].jobTitle", equalTo("Sales executive"))
                .body("[0].assignedToName", equalTo("Test User"));
        as(hr).get("/api/v1/candidates/" + candidateId + "/applications").then().statusCode(200)
                .body("[0].jobTitle", equalTo("Sales executive"));
    }

    @Test
    void aCandidateCannotApplyToTheSameJobTwice() {
        String jobId = job("Sales executive");
        String candidateId = candidate("Asha", "Verma", "asha@example.com");
        apply(jobId, candidateId);

        as(hr).body(Map.of("jobId", jobId, "candidateId", candidateId)).post("/api/v1/applications").then().statusCode(409);
    }

    @Test
    void anApplicationCannotBeGivenToSomeoneOutsideTheOrganization() {
        String jobId = job("Sales executive");
        String candidateId = candidate("Asha", "Verma", "asha@example.com");
        Account outsider = accounts.activeUser(RoleCodes.HR);

        as(hr).body(Map.of("jobId", jobId, "candidateId", candidateId, "assignedToUserId", outsider.id().toString()))
                .post("/api/v1/applications").then().statusCode(400);
    }

    @Test
    void anApplicationMovesForwardThenIsHiredOrRejected() {
        String jobId = job("Sales executive");
        String hired = apply(jobId, candidate("Asha", "Verma", "asha@example.com"));
        String turnedDown = apply(jobId, candidate("Rohit", "Nair", "rohit@example.com"));

        as(hr).body(Map.of("stage", "SCREENING")).put("/api/v1/applications/" + hired + "/stage").then().statusCode(200).body("stage", equalTo("SCREENING"));
        as(hr).body(Map.of("stage", "APPLIED")).put("/api/v1/applications/" + hired + "/stage").then().statusCode(422);
        as(hr).put("/api/v1/applications/" + hired + "/hire").then().statusCode(422);
        for (String stage : new String[] {"SHORTLISTED", "INTERVIEW", "SELECTED"}) {
            as(hr).body(Map.of("stage", stage)).put("/api/v1/applications/" + hired + "/stage").then().statusCode(200);
        }
        as(hr).put("/api/v1/applications/" + hired + "/hire").then().statusCode(200).body("stage", equalTo("HIRED")).body("candidateName", equalTo("Asha Verma"));

        as(hr).body(Map.of("reason", "Salary expectations too high")).put("/api/v1/applications/" + turnedDown + "/reject").then().statusCode(200)
                .body("stage", equalTo("REJECTED")).body("rejectionReason", equalTo("Salary expectations too high"));
        as(hr).put("/api/v1/applications/" + hired + "/reject").then().statusCode(422);
    }

    @Test
    void anInterviewIsScheduledCompletedOrCancelledAndNamesWhoTakesIt() {
        String applicationId = apply(job("Sales executive"), candidate("Asha", "Verma", "asha@example.com"));
        Account interviewer = accounts.activeColleagueOf(hrAccount, RoleCodes.SALES_MANAGER);
        Map<String, Object> request = Map.of("interviewType", "VIDEO", "scheduledAt", "2031-03-04T10:30:00Z", "durationMinutes", 45,
                "interviewerUserId", interviewer.id().toString(), "location", "Meet link in the invite");

        String interviewId = as(hr).body(request).post("/api/v1/applications/" + applicationId + "/interviews").then().statusCode(201)
                .body("interviewerName", equalTo("Test User")).body("completed", equalTo(false)).extract().path("id");

        as(hr).get("/api/v1/applications/" + applicationId).then().statusCode(200)
                .body("candidate.fullName", equalTo("Asha Verma"))
                .body("job.title", equalTo("Sales executive"))
                .body("interviews", hasSize(1))
                .body("interviews[0].interviewerName", equalTo("Test User"));

        as(hr).body(Map.of("feedback", "Strong on site surveys", "rating", 4)).put("/api/v1/interviews/" + interviewId + "/complete").then().statusCode(200)
                .body("completed", equalTo(true)).body("rating", equalTo(4));
        as(hr).body(Map.of("feedback", "Again", "rating", 5)).put("/api/v1/interviews/" + interviewId + "/complete").then().statusCode(422);
        as(hr).delete("/api/v1/interviews/" + interviewId).then().statusCode(422);

        String second = as(hr).body(request).post("/api/v1/applications/" + applicationId + "/interviews").then().statusCode(201).extract().path("id");
        as(hr).delete("/api/v1/interviews/" + second).then().statusCode(204);
        as(hr).get("/api/v1/applications/" + applicationId + "/interviews").then().statusCode(200).body("$", hasSize(1));
    }

    @Test
    void anInterviewerFromAnotherOrganizationIsRefused() {
        String applicationId = apply(job("Sales executive"), candidate("Asha", "Verma", "asha@example.com"));
        Account outsider = accounts.activeUser(RoleCodes.HR);

        as(hr).body(Map.of("interviewType", "PHONE", "scheduledAt", "2031-03-04T10:30:00Z", "interviewerUserId", outsider.id().toString()))
                .post("/api/v1/applications/" + applicationId + "/interviews").then().statusCode(400);
    }

    @Test
    void aJobWithApplicationsIsClosedNotDeleted() {
        String withApplicants = job("Sales executive");
        apply(withApplicants, candidate("Asha", "Verma", "asha@example.com"));
        String empty = job("Site supervisor");

        as(hr).delete("/api/v1/jobs/" + withApplicants).then().statusCode(422).body("detail", containsString("Close it instead"));
        as(hr).get("/api/v1/jobs/" + withApplicants).then().statusCode(200);
        as(hr).delete("/api/v1/jobs/" + empty).then().statusCode(204);
        as(hr).get("/api/v1/jobs/" + empty).then().statusCode(404);
    }

    @Test
    void aSalaryRangeThatRunsBackwardsIsRefused() {
        as(hr).body(Map.of("title", "Designer", "department", "Studio", "description", "Design homes", "minSalary", 90000, "maxSalary", 50000))
                .post("/api/v1/jobs").then().statusCode(400);
    }

    @Test
    void peopleWhoCanOnlyViewRecruitmentCannotChangeIt() {
        String jobId = job("Sales executive");
        String director = tokenFor(accounts.activeColleagueOf(hrAccount, RoleCodes.DIRECTOR));
        String technician = tokenFor(accounts.activeColleagueOf(hrAccount, RoleCodes.TECHNICIAN));

        as(director).get("/api/v1/jobs").then().statusCode(200);
        as(director).get("/api/v1/jobs/" + jobId + "/applications").then().statusCode(200);
        as(director).body(Map.of("title", "Designer", "department", "Studio", "description", "Design homes")).post("/api/v1/jobs").then().statusCode(403);
        as(director).body(Map.of("firstName", "A", "lastName", "B", "email", "ab@example.com")).post("/api/v1/candidates").then().statusCode(403);

        as(technician).get("/api/v1/jobs").then().statusCode(403);
        as(technician).get("/api/v1/candidates").then().statusCode(403);
    }

    @Test
    void anotherOrganizationNeverSeesTheseCandidatesOrApplications() {
        String jobId = job("Sales executive");
        String candidateId = candidate("Asha", "Verma", "asha@example.com");
        String applicationId = apply(jobId, candidateId);
        String outsider = tokenFor(accounts.activeUser(RoleCodes.HR));

        as(outsider).get("/api/v1/jobs").then().statusCode(200).body("$", hasSize(0));
        as(outsider).get("/api/v1/candidates").then().statusCode(200).body("$", hasSize(0));
        as(outsider).get("/api/v1/jobs/" + jobId).then().statusCode(404);
        as(outsider).get("/api/v1/candidates/" + candidateId).then().statusCode(404);
        as(outsider).get("/api/v1/applications/" + applicationId).then().statusCode(404);
        as(outsider).get("/api/v1/jobs/" + jobId + "/applications").then().statusCode(404);
        as(outsider).body(Map.of("stage", "SCREENING")).put("/api/v1/applications/" + applicationId + "/stage").then().statusCode(404);
        as(outsider).body(Map.of("jobId", jobId, "candidateId", candidate2(outsider))).post("/api/v1/applications").then().statusCode(404);

        as(hr).get("/api/v1/applications/" + applicationId).then().statusCode(200).body("application.stage", equalTo("APPLIED"));
        as(hr).get("/api/v1/jobs").then().statusCode(200).body("title", containsInAnyOrder("Sales executive"));
        as(hr).get("/api/v1/candidates/" + candidateId).then().statusCode(200).body("resumeStorageKey", nullValue());
    }

    private String candidate2(String token) {
        return as(token).body(Map.of("firstName", "Out", "lastName", "Sider", "email", "outsider@example.com"))
                .post("/api/v1/candidates").then().statusCode(201).extract().path("id");
    }
}
