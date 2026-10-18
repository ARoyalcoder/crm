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

            List<String> modelsToTry = List.of(this.model, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest");
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
                return new AskResponse(
                        question,
                        answerText.trim(),
                        "Answered by PAWAN AI (" + successfulModel + ")",
                        List.of(),
                        0,
                        null,
                        null
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
        String userRole = user != null && user.roles() != null && !user.roles().isEmpty()
                ? String.join(", ", user.roles())
                : "Staff";
        String userEmail = user != null ? user.email() : "Team Member";
        return """
                You are PAWAN, the official conversational AI assistant for Pawan Putra Akhand Bharat Pvt. Ltd. (Head Office: Lucknow, Uttar Pradesh, India).
                Company Business Verticals:
                1. CCTV & Security (Camera supply, installation, networking, repair, AMC)
                2. Digital Marketing (SEO, social media, paid ads, website development, lead generation)
                3. Interior Design (Home/office/showroom design, execution coordination, BOQ)
                4. Architecture & Tech (CAD, 2D/3D drawings, planning, technical design)
                5. Solar (Rooftop solar survey, BOQ, installation, maintenance, DISCOM approvals)
                6. IT Support (Hardware/software support, networking, cloud setup, IT AMC)

                User asking: %s (Role: %s).
                Guidelines:
                - Be helpful, polite, professional, and clear.
                - Keep answers concise and direct (around 2-4 sentences or short bullet points).
                - If the question is in Hindi or Hinglish, answer in natural Hindi/Hinglish. If in English, answer in English.
                - Where relevant, guide the user to relevant CRM sections: Leads (/leads), Pipeline (/pipeline), Quotations (/quotations), Projects (/projects), Invoices (/finance/invoices), or Tickets (/service-contracts/tickets).
                """.formatted(userEmail, userRole);
    }

    private AskResponse fallbackResponse(String question) {
        return new AskResponse(
                question,
                "I am here to help you navigate Pawan Putra CRM. Try asking about open leads, delayed projects, overdue invoices, or today's tasks.",
                "Ask PAWAN answers questions about your business records and services across all 6 verticals.",
                List.of(),
                0,
                null,
                null
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
