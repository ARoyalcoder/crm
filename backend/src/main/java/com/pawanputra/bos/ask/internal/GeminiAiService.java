package com.pawanputra.bos.ask.internal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.platform.security.CurrentUser;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Connects Ask PAWAN to Google Gemini generative AI for conversational answers,
 * business guidance, vertical service information, and intelligent CRM assistance.
 */
@Service
public class GeminiAiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiAiService.class);
    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com";

    private final String apiKey;
    private final String model;
    private final boolean enabled;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAiService(
            @Value("${app.ai.gemini.api-key:}") String apiKey,
            @Value("${app.ai.gemini.model:gemini-3.6-flash}") String model,
            @Value("${app.ai.gemini.enabled:true}") boolean enabled,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey != null ? apiKey.strip() : "";
        this.model = model != null && !model.isBlank() ? model.strip() : "gemini-3.6-flash";
        this.enabled = enabled && !this.apiKey.isBlank();
        this.restClient = RestClient.builder().baseUrl(GEMINI_API_BASE).build();
        this.objectMapper = objectMapper;

        if (this.enabled) {
            log.info("Gemini AI Assistant initialized with model: {}", this.model);
        } else {
            log.warn("Gemini AI Assistant disabled (API key missing or disabled)");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public AskResponse generateAnswer(String question, CurrentUser user) {
        if (!enabled) {
            return fallbackResponse(question);
        }

        try {
            String systemPrompt = buildSystemPrompt(user);
            String fullPrompt = systemPrompt + "\n\nUser Question: " + question;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", fullPrompt)))
                    )
            );

            List<String> modelsToTry = List.of(
                    this.model,
                    "gemini-2.5-flash",
                    "gemini-1.5-flash",
                    "gemini-2.0-flash",
                    "gemini-3.6-flash",
                    "gemini-3.5-flash"
            );
            String answerText = null;
            String successfulModel = null;

            for (String candidateModel : modelsToTry) {
                answerText = callGemini(candidateModel, requestBody);
                if (answerText != null && !answerText.isBlank()) {
                    successfulModel = candidateModel;
                    break;
                }
            }

            if (answerText != null && !answerText.isBlank()) {
                String cleanAnswer = answerText.trim();
                String recAction = null;
                String recUrl = null;

                // Extract any Recommended Action: <Label> | <Url> from the end of the text
                java.util.regex.Pattern actionPattern = java.util.regex.Pattern.compile(
                        "(?i)(?:recommended\\s*action|action\\s*link|action):\\s*([^|\\n\\r]+)(?:\\|\\s*([^\\n\\r]+))?");
                java.util.regex.Matcher matcher = actionPattern.matcher(cleanAnswer);
                if (matcher.find()) {
                    recAction = matcher.group(1) != null ? matcher.group(1).trim() : null;
                    recUrl = matcher.group(2) != null ? matcher.group(2).trim() : null;
                    cleanAnswer = cleanAnswer.substring(0, matcher.start()).trim();
                }

                // If no explicit action was specified, deduce the most relevant action from context
                if (recAction == null || recUrl == null) {
                    String lowerQ = question.toLowerCase();
                    String lowerA = cleanAnswer.toLowerCase();
                    if (lowerQ.contains("lead") || lowerA.contains("lead")) {
                        recAction = "View Leads";
                        recUrl = "/leads";
                    } else if (lowerQ.contains("invoice") || lowerQ.contains("bill") || lowerA.contains("overdue invoice")) {
                        recAction = "Review Invoices";
                        recUrl = "/invoices";
                    } else if (lowerQ.contains("receivable") || lowerQ.contains("payment") || lowerA.contains("receivables")) {
                        recAction = "View Receivables";
                        recUrl = "/receivables";
                    } else if (lowerQ.contains("project") || lowerA.contains("project")) {
                        recAction = "Check Projects";
                        recUrl = "/projects";
                    } else if (lowerQ.contains("ticket") || lowerA.contains("support ticket")) {
                        recAction = "Open Tickets";
                        recUrl = "/support/tickets";
                    } else if (lowerQ.contains("amc") || lowerA.contains("amc contract")) {
                        recAction = "View AMC Contracts";
                        recUrl = "/amc-contracts";
                    } else if (lowerQ.contains("deal") || lowerQ.contains("pipeline") || lowerQ.contains("opportunit")) {
                        recAction = "Open Deals Pipeline";
                        recUrl = "/opportunities";
                    } else if (lowerQ.contains("attend") || lowerQ.contains("leave") || lowerQ.contains("employee")) {
                        recAction = "Workforce Directory";
                        recUrl = "/workforce/employees";
                    }
                }

                return new AskResponse(
                        question,
                        cleanAnswer,
                        "Actionable guidance by PAWAN AI (" + successfulModel + ") based on your authorized role",
                        List.of(),
                        0,
                        recAction,
                        recUrl
                );
            }
        } catch (Exception ex) {
            log.error("Failed to generate answer from Gemini for question '{}': {}", question, ex.getMessage());
        }

        return fallbackResponse(question);
    }

    private String callGemini(String modelName, Map<String, Object> requestBody) {
        try {
            String endpoint = "/v1beta/models/" + modelName + ":generateContent";
            String rawJson = restClient.post()
                    .uri(endpoint)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (rawJson != null) {
                GeminiResponse response = objectMapper.readValue(rawJson, GeminiResponse.class);
                if (response.candidates != null && !response.candidates.isEmpty()) {
                    var candidate = response.candidates.get(0);
                    if (candidate.content != null && candidate.content.parts != null && !candidate.content.parts.isEmpty()) {
                        return candidate.content.parts.get(0).text;
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Gemini model {} failed: {}", modelName, ex.getMessage());
        }
        return null;
    }

    private String buildSystemPrompt(CurrentUser user) {
        String userRoles = user != null && user.roles() != null && !user.roles().isEmpty()
                ? String.join(", ", user.roles())
                : "STAFF";
        String userEmail = user != null ? user.email() : "Team Member";

        StringBuilder roleFocus = new StringBuilder();
        if (user != null) {
            if (user.hasRole("SUPER_ADMIN") || user.hasRole("ADMIN") || user.hasRole("DIRECTOR")) {
                roleFocus.append("""
                        [ROLE CONTEXT: EXECUTIVE / DIRECTOR / ADMIN]
                        - Scope: Enterprise-wide oversight across all 6 business verticals.
                        - Primary Focus: Strategic KPIs, revenue vs expense, cross-department risks, high-level pipeline health, receivables aging, delivery velocity.
                        - Permitted CRM Actions: Full system access (/dashboard, /opportunities, /invoices, /projects, /receivables, /workforce/employees).
                        - Action Advice: Suggest high-leverage executive actions, approvals, and strategic interventions.
                        """);
            } else if (user.hasRole("SALES_MANAGER") || user.hasRole("SALES_EXECUTIVE")) {
                roleFocus.append("""
                        [ROLE CONTEXT: SALES & BUSINESS DEVELOPMENT]
                        - Scope: Lead conversion, quotations, pipeline acceleration, customer accounts.
                        - Primary Focus: Uncontacted leads, quotation follow-ups, opportunity deal stages, closing timelines, customer qualification.
                        - Permitted CRM Actions: /leads, /opportunities, /quotations, /customers, /activities.
                        - Strict Role Boundary: Do NOT disclose internal payroll, accounting ledger details, or unrelated administrative files. Focus on client acquisition and deal closure.
                        """);
            } else if (user.hasRole("FINANCE")) {
                roleFocus.append("""
                        [ROLE CONTEXT: FINANCE & ACCOUNTS]
                        - Scope: Invoicing, payment reconciliation, receivables collection, tax invoices, aging.
                        - Primary Focus: Overdue invoices, 30/60/90+ day debtors, unallocated bank payments, collections performance.
                        - Permitted CRM Actions: /invoices, /payments, /receivables, /finance/ageing.
                        - Action Advice: Guide the user to prioritize high-risk debts and record receipt allocations.
                        """);
            } else if (user.hasRole("PROJECT_MANAGER") || user.hasRole("DESIGNER")) {
                roleFocus.append("""
                        [ROLE CONTEXT: PROJECT MANAGEMENT & TECHNICAL DESIGN]
                        - Scope: Project delivery milestones, site drawings, BOQs, client signoffs.
                        - Primary Focus: Delayed milestones, pending site surveys, material preparation, CAD execution.
                        - Permitted CRM Actions: /projects, /project-analytics, /field-jobs.
                        - Strict Role Boundary: Focus on project deadlines and technical delivery rather than company balance sheets.
                        """);
            } else if (user.hasRole("TECHNICIAN")) {
                roleFocus.append("""
                        [ROLE CONTEXT: FIELD TECHNICIAN / SERVICE ENGINEER]
                        - Scope: Assigned site jobs, equipment installations, repair checklists, proof of work.
                        - Primary Focus: Today's scheduled visits, site directions, installation tools, completion sign-off.
                        - Permitted CRM Actions: /my-jobs, /activities.
                        - Strict Role Boundary: Do NOT disclose company-wide financial metrics or revenue data. Emphasize site execution and safety.
                        """);
            } else if (user.hasRole("SUPPORT_AGENT")) {
                roleFocus.append("""
                        [ROLE CONTEXT: CUSTOMER SUPPORT & AMC SERVICE]
                        - Scope: Customer service tickets, SLA compliance, warranty verification, AMC renewals.
                        - Primary Focus: Resolving escalated tickets, preventing SLA breaches, scheduling service visits.
                        - Permitted CRM Actions: /support/tickets, /amc-contracts, /warranties.
                        """);
            } else if (user.hasRole("HR")) {
                roleFocus.append("""
                        [ROLE CONTEXT: HUMAN RESOURCES & WORKFORCE]
                        - Scope: Employee records, attendance tracking, leave requests, shift adherence.
                        - Primary Focus: Daily staff presence, pending leave approvals, workforce onboarding.
                        - Permitted CRM Actions: /workforce/employees, /workforce/attendance, /performance/dashboard.
                        """);
            }
        }

        return """
                You are PAWAN, the official AI Business OS Copilot for Pawan Putra Akhand Bharat Pvt. Ltd. (Lucknow, Uttar Pradesh, India).
                Company Business Verticals:
                1. CCTV & Security (Camera supply, installation, networking, repair, AMC)
                2. Digital Marketing (SEO, social media, paid ads, website development, lead generation)
                3. Interior Design (Home/office/showroom design, execution coordination, BOQ)
                4. Architecture & Tech (CAD, 2D/3D drawings, planning, technical design)
                5. Solar (Rooftop solar survey, BOQ, installation, maintenance, DISCOM approvals)
                6. IT Support (Hardware/software support, networking, cloud setup, IT AMC)

                USER CONTEXT:
                User: %s
                Assigned Roles: %s

                %s

                OPERATIONAL GUIDELINES:
                1. Always tailor your analysis, guidance, and tone according to the user's specific role described above.
                2. Respect role boundaries: if a user asks about data or actions outside their department/permission scope, politely explain the boundary and guide them toward relevant actions within their role.
                3. Keep answers concise, clear, and actionable (2-4 sentences or structured bullets).
                4. Languages: If asked in Hindi or Hinglish, answer in natural conversational Hindi/Hinglish. If in English, answer in English.
                5. Whenever appropriate, end your answer with an actionable next step in the format:
                   Recommended Action: <Action Label> | <CRM URL>
                   (Examples: Recommended Action: View Leads | /leads, Recommended Action: Check Receivables | /receivables, Recommended Action: My Field Jobs | /my-jobs)
                """.formatted(userEmail, userRoles, roleFocus.toString());
    }

    private AskResponse fallbackResponse(String question) {
        return new AskResponse(
                question,
                "I am PAWAN, your role-aware Business OS Assistant. I provide targeted operational guidance and actions tailored to your department and permissions.",
                "Ask PAWAN answers questions and initiates CRM actions according to your authorized role.",
                List.of(),
                0,
                "Explore CRM",
                "/"
        );
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GeminiResponse {
        public List<Candidate> candidates;

        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Candidate {
            public Content content;
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Content {
            public List<Part> parts;
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Part {
            public String text;
        }
    }
}
