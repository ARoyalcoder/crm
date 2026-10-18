package com.pawanputra.bos.document;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import io.restassured.specification.RequestSpecification;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * Documents filed against a record: who uploaded them is named, replacing a file keeps the old one in the history, and one
 * organization never sees another's.
 */
class DocumentsIT extends AbstractIntegrationTest {

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    Account adminAccount;
    String admin;
    String customerId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        adminAccount = accounts.activeUser(RoleCodes.ADMIN);
        admin = tokenFor(adminAccount);
        customerId = as(admin).body(Map.of("type", "BUSINESS", "companyName", "Acme Solar", "phone", "9876543210"))
                .post("/api/v1/customers").then().statusCode(201).extract().path("id");
    }

    private RequestSpecification file(String token, String name, String text) {
        return given().header("Authorization", "Bearer " + token)
                .multiPart("file", name, text.getBytes(StandardCharsets.UTF_8), "text/plain");
    }

    private String upload(String token, String entityId) {
        return file(token, "site-notes.txt", "first draft")
                .multiPart("entityType", "CUSTOMER").multiPart("entityId", entityId)
                .multiPart("category", "REPORT").multiPart("title", "Site notes")
                .post("/api/v1/documents/upload").then().statusCode(201)
                .body("title", equalTo("Site notes"))
                .body("uploadedByName", equalTo("Test User"))
                .extract().path("id");
    }

    @Test
    void anUploadedDocumentNamesWhoFiledItInEveryList() {
        String id = upload(admin, customerId);

        as(admin).get("/api/v1/documents/entity/CUSTOMER/" + customerId).then().statusCode(200)
                .body("id", hasItem(id)).body("[0].uploadedByName", equalTo("Test User"));
        as(admin).get("/api/v1/documents").then().statusCode(200)
                .body("id", hasItem(id)).body("find { it.id == '" + id + "' }.uploadedByName", equalTo("Test User"));
        as(admin).get("/api/v1/documents/mine").then().statusCode(200)
                .body("[0].uploadedByName", equalTo("Test User"));
        as(admin).get("/api/v1/documents/storage-summary").then().statusCode(200)
                .body("totalFiles", equalTo(1));
        as(admin).get("/api/v1/documents/" + id + "/download").then().statusCode(200).body("url", containsString("/documents/"));
    }

    @Test
    void replacingAFileKeepsTheOldOneInTheHistoryWithItsNote() {
        String id = upload(admin, customerId);

        file(admin, "site-notes-v2.txt", "second draft").multiPart("notes", "Corrected the totals")
                .post("/api/v1/documents/" + id + "/version").then().statusCode(200)
                .body("documentVersion", equalTo(2)).body("originalFileName", equalTo("site-notes-v2.txt"));

        as(admin).get("/api/v1/documents/" + id + "/versions").then().statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].versionNumber", equalTo(1))
                .body("[0].originalFileName", equalTo("site-notes.txt"))
                .body("[0].notes", equalTo("Corrected the totals"))
                .body("[0].uploadedByName", equalTo("Test User"));
    }

    @Test
    void anotherOrganizationNeverSeesOrOpensTheDocument() {
        String id = upload(admin, customerId);
        String outsider = tokenFor(accounts.activeUser(RoleCodes.ADMIN));

        as(outsider).get("/api/v1/documents").then().statusCode(200).body("$", empty());
        as(outsider).get("/api/v1/documents/entity/CUSTOMER/" + customerId).then().statusCode(200).body("$", empty());
        as(outsider).get("/api/v1/documents/" + id).then().statusCode(404);
        as(outsider).get("/api/v1/documents/" + id + "/download").then().statusCode(404);
        as(outsider).get("/api/v1/documents/" + id + "/versions").then().statusCode(404);
        as(outsider).delete("/api/v1/documents/" + id).then().statusCode(404);
        as(admin).get("/api/v1/documents/" + id).then().statusCode(200);
    }

    @Test
    void aFileTypeThatIsNotAllowedIsRefused() {
        given().header("Authorization", "Bearer " + admin)
                .multiPart("file", "run.exe", "MZ".getBytes(StandardCharsets.UTF_8), "application/x-msdownload")
                .multiPart("entityType", "CUSTOMER").multiPart("entityId", customerId)
                .multiPart("category", "OTHER").multiPart("title", "Not a document")
                .post("/api/v1/documents/upload").then().statusCode(not(equalTo(201)));
        as(admin).get("/api/v1/documents").then().statusCode(200).body("$", empty());
    }
}
