package com.pawanputra.bos.analytics;

import static com.pawanputra.bos.support.ApiClient.as;
import static com.pawanputra.bos.support.ApiClient.tokenFor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

import com.pawanputra.bos.identity.api.RoleCodes;
import com.pawanputra.bos.support.AbstractIntegrationTest;
import com.pawanputra.bos.support.TestAccounts;
import com.pawanputra.bos.support.TestAccounts.Account;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

/**
 * The finance dashboard against the books it summarises. The invoices and payments are created through the
 * finance API (so every rule of that module applies to them), and the dashboard must then agree, to the
 * rupee, with what that module itself reports: the same outstanding, overdue, ageing and month totals.
 */
class AnalyticsFinanceIT extends AbstractIntegrationTest {

    private static final String ANALYTICS = "/api/v1/analytics";
    private static final String FINANCE = "/api/v1/finance";
    private static final String INVOICES = "/api/v1/invoices";
    private static final String PAYMENTS = "/api/v1/payments";
    private static final String METHODS = "/api/v1/payment-methods";
    private static final String CUSTOMERS = "/api/v1/customers";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Value("${local.server.port}")
    int port;

    @Autowired TestAccounts accounts;

    LocalDate today;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        today = LocalDate.now(BUSINESS_ZONE);
    }

    /** One organization's books: someone who prepares and issues, someone who approves, someone who only reads. */
    private final class Books {
        final Account account = accounts.activeUser(RoleCodes.ADMIN);
        final String admin = tokenFor(account);
        final String finance = tokenFor(accounts.activeColleagueOf(account, RoleCodes.FINANCE));
        final String director = tokenFor(accounts.activeColleagueOf(account, RoleCodes.DIRECTOR));
        final String cash = as(finance).get(METHODS).path("find { it.code == 'CASH' }.id");

        String customer(String name, String phone) {
            return as(admin).body(Map.of("type", "BUSINESS", "companyName", name, "phone", phone))
                    .post(CUSTOMERS).then().statusCode(201).extract().path("id");
        }

        /** An invoice for the amount (no tax), issued on the date and due on the other. Null dates mean today and fifteen days on. */
        String invoice(String customer, int amount, LocalDate issued, LocalDate due) {
            String id = as(admin).body(Map.of("customerId", customer,
                            "items", List.of(Map.of("description", "Work done", "quantity", 1, "unitPrice", amount, "taxPercent", 0))))
                    .post(INVOICES).then().statusCode(201).extract().path("invoice.id");
            Map<String, Object> body = new HashMap<>();
            if (issued != null) {
                body.put("issueDate", issued.toString());
            }
            if (due != null) {
                body.put("dueDate", due.toString());
            }
            as(admin).body(body).post(INVOICES + "/" + id + "/issue").then().statusCode(200);
            return id;
        }

        /** A payment received today, put against one invoice. Returns the payment's id. */
        String pay(String customer, int amount, String invoice) {
            return as(admin).body(Map.of("customerId", customer, "amount", amount, "methodId", cash,
                            "allocations", List.of(Map.of("invoiceId", invoice, "amount", amount))))
                    .post(PAYMENTS).then().statusCode(201).extract().path("payment.id");
        }

        Response dashboard() {
            Response response = as(director).get(ANALYTICS + "/finance");
            response.then().statusCode(200);
            return response;
        }
    }

    @Test
    void theDashboardAgreesWithTheFinanceModulesOwnReport() {
        Books books = new Books();
        String acme = books.customer("Acme Solar", "9876543210");
        String bright = books.customer("Bright Interiors", "9876500001");

        books.invoice(acme, 1000, today.minusDays(100), today.minusDays(95));   // 95 days late, issued long before the period
        String old = books.invoice(acme, 2000, today.minusDays(50), today.minusDays(45)); // 45 days late, issued in the period before
        books.invoice(acme, 4000, null, null);                                   // issued today, not due for 15 days
        books.invoice(acme, 50, today.minusDays(7), today);                      // due today: not overdue yet
        books.invoice(bright, 300, today.minusDays(10), today.minusDays(1));     // one day late
        books.pay(acme, 500, old);

        Response dashboard = books.dashboard();
        dashboard.then()
                .body("overview.invoiced.value", equalTo(4350.0f)).body("overview.invoiced.previous", equalTo(2000.0f))
                .body("overview.collected.value", equalTo(500.0f)).body("overview.collected.previous", equalTo(0.0f))
                .body("overview.outstanding.amount", equalTo(6850.0f)).body("overview.outstanding.invoices", equalTo(5))
                .body("overview.overdue.amount", equalTo(2800.0f)).body("overview.overdue.invoices", equalTo(3))
                .body("overview.collectionRatePct", equalTo(11.5f))
                .body("overview.ageing.key", contains("NOT_DUE", "D1_30", "D31_60", "D61_90", "D91_PLUS"))
                .body("overview.ageing.amount", contains(4050.0f, 300.0f, 1500.0f, 0.0f, 1000.0f))
                .body("overview.ageing.invoices", contains(2, 1, 1, 0, 1))
                .body("dsoDays", equalTo(47))
                .body("topDebtors.customerName", contains("Acme Solar", "Bright Interiors"))
                .body("topDebtors[0].outstanding", equalTo(6550.0f)).body("topDebtors[0].overdue", equalTo(2500.0f))
                .body("topDebtors[0].invoices", equalTo(4)).body("topDebtors[0].oldestDaysOverdue", equalTo(95))
                .body("topDebtors[1].overdue", equalTo(300.0f)).body("topDebtors[1].oldestDaysOverdue", equalTo(1))
                .body("collectedByMethod.method", contains("Cash")).body("collectedByMethod[0].amount", equalTo(500.0f))
                .body("collectedByMethod[0].payments", equalTo(1))
                .body("overview.trend", hasSize(30))
                .body("overview.trend[29].bucket", equalTo(today.toString()))
                .body("overview.trend[29].invoiced", equalTo(4000.0f)).body("overview.trend[29].collected", equalTo(500.0f));
        // Every rupee invoiced in the period is on the chart, once.
        List<Float> invoicedPerDay = dashboard.path("overview.trend.invoiced");
        assertThat(invoicedPerDay.stream().mapToDouble(Float::doubleValue).sum()).isCloseTo(4350.0, within(0.001));

        // The finance module's own report says the same about what is owed and what came in this month.
        Response summary = as(books.finance).get(FINANCE + "/summary");
        Response ageing = as(books.finance).get(FINANCE + "/ageing");
        assertThat(dashboard.<Float>path("overview.outstanding.amount")).isEqualTo(summary.<Float>path("outstanding"));
        assertThat(dashboard.<Float>path("overview.overdue.amount")).isEqualTo(summary.<Float>path("overdue"));
        assertThat(dashboard.<Integer>path("overview.outstanding.invoices")).isEqualTo(summary.<Integer>path("openInvoices"));
        assertThat(dashboard.<Integer>path("overview.overdue.invoices")).isEqualTo(summary.<Integer>path("overdueInvoices"));
        assertThat(dashboard.<List<Float>>path("overview.ageing.amount")).isEqualTo(ageing.<List<Float>>path("totals"));

        Response month = as(books.director).queryParam("from", today.withDayOfMonth(1).toString()).queryParam("to", today.toString())
                .get(ANALYTICS + "/finance");
        assertThat(month.<Float>path("overview.invoiced.value")).isEqualTo(summary.<Float>path("invoicedThisMonth"));
        assertThat(month.<Float>path("overview.collected.value")).isEqualTo(summary.<Float>path("receivedThisMonth"));
    }

    @Test
    void aReversedPaymentIsNotCollectedAndACreditNoteLowersWhatIsOwed() {
        Books books = new Books();
        String customer = books.customer("Acme Solar", "9876543210");
        String first = books.invoice(customer, 1000, null, null);
        String second = books.invoice(customer, 1000, null, null);
        String firstPayment = books.pay(customer, 1000, first);
        books.pay(customer, 400, second);

        books.dashboard().then()
                .body("overview.collected.value", equalTo(1400.0f))
                .body("overview.outstanding.amount", equalTo(600.0f)).body("overview.outstanding.invoices", equalTo(1));

        // The first payment bounced; and 300 of the second invoice is written off by a credit note.
        as(books.finance).body(Map.of("reason", "Cheque bounced")).post(PAYMENTS + "/" + firstPayment + "/reverse")
                .then().statusCode(200);
        as(books.finance).body(Map.of("amount", 300, "reason", "One camera returned"))
                .post(INVOICES + "/" + second + "/credit-notes").then().statusCode(201);

        Response dashboard = books.dashboard();
        dashboard.then()
                // The reversed money never counts as collected; the rest does.
                .body("overview.collected.value", equalTo(400.0f))
                .body("collectedByMethod[0].amount", equalTo(400.0f)).body("collectedByMethod[0].payments", equalTo(1))
                // The first invoice is owed in full again; the second is 1000 - 300 credit - 400 paid.
                .body("overview.outstanding.amount", equalTo(1300.0f)).body("overview.outstanding.invoices", equalTo(2))
                // A credit note changes what is owed, not what was invoiced.
                .body("overview.invoiced.value", equalTo(2000.0f));

        Response summary = as(books.finance).get(FINANCE + "/summary");
        assertThat(dashboard.<Float>path("overview.outstanding.amount")).isEqualTo(summary.<Float>path("outstanding"));
        assertThat(dashboard.<Float>path("overview.collected.value")).isEqualTo(summary.<Float>path("receivedThisMonth"));
        assertThat(dashboard.<Float>path("overview.invoiced.value")).isEqualTo(summary.<Float>path("invoicedThisMonth"));
    }

    @Test
    void draftsAndCancelledInvoicesAreNotRevenue() {
        Books books = new Books();
        String customer = books.customer("Acme Solar", "9876543210");
        books.invoice(customer, 700, null, null);
        // An invoice raised by mistake and cancelled is on record, but it was never owed.
        String mistake = books.invoice(customer, 500, null, null);
        as(books.finance).body(Map.of("reason", "Raised twice")).post(INVOICES + "/" + mistake + "/cancel").then().statusCode(200);
        // A draft is only a plan: nothing is invoiced, owed or ageing until it is issued.
        as(books.admin).body(Map.of("customerId", customer,
                        "items", List.of(Map.of("description", "Not yet", "quantity", 1, "unitPrice", 9999, "taxPercent", 0))))
                .post(INVOICES).then().statusCode(201);

        books.dashboard().then()
                .body("overview.invoiced.value", equalTo(700.0f))
                .body("overview.outstanding.amount", equalTo(700.0f)).body("overview.outstanding.invoices", equalTo(1));
    }

    @Test
    void anotherOrganizationsBooksNeverAppear() {
        Books ours = new Books();
        Books theirs = new Books();
        String us = ours.customer("Our Customer", "9876500010");
        String them = theirs.customer("Their Customer", "9876500011");
        ours.invoice(us, 1000, null, null);
        theirs.invoice(them, 777, null, null);

        ours.dashboard().then()
                .body("overview.invoiced.value", equalTo(1000.0f)).body("overview.outstanding.amount", equalTo(1000.0f))
                .body("topDebtors.customerName", contains("Our Customer"));
        theirs.dashboard().then()
                .body("overview.invoiced.value", equalTo(777.0f)).body("overview.outstanding.amount", equalTo(777.0f))
                .body("topDebtors.customerName", contains("Their Customer"));

        // The control tower and the older monthly chart read the same books and keep to the same walls.
        as(ours.director).get(ANALYTICS + "/control-tower").then().statusCode(200)
                .body("finance.outstanding.amount", equalTo(1000.0f));
        as(theirs.director).queryParam("year", today.getYear()).get(ANALYTICS + "/sales/by-period").then().statusCode(200)
                .body("revenue.sum()", equalTo(777.0f));
        as(new Books().director).get(ANALYTICS + "/finance").then().body("topDebtors", empty());
    }
}
