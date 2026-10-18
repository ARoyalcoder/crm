package com.pawanputra.bos.integration.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.integration.api.EmailProvider;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Outbound email delivery backed by SendGrid v3 Mail Send API.
 */
@Component
public class SendGridEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(SendGridEmailProvider.class);
    private static final String SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";
    private static final String SENDGRID_SCOPES_URL = "https://api.sendgrid.com/v3/scopes";

    private final String apiKey;
    private final String fromEmail;
    private final String fromName;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SendGridEmailProvider(
            @Value("${app.integration.sendgrid.api-key:}") String apiKey,
            @Value("${app.integration.sendgrid.from-email:noreply@pawanputra.com}") String fromEmail,
            @Value("${app.integration.sendgrid.from-name:Pawan Putra Business OS}") String fromName,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey != null ? apiKey.strip() : "";
        this.fromEmail = fromEmail != null && !fromEmail.isBlank() ? fromEmail.strip() : "noreply@pawanputra.com";
        this.fromName = fromName != null && !fromName.isBlank() ? fromName.strip() : "Pawan Putra Business OS";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        if (isConfigured()) {
            log.info("SendGrid email integration active (from: {} <{}>)", this.fromName, this.fromEmail);
        } else {
            log.info("SendGrid email integration initialized without API key (set SENDGRID_API_KEY to activate)");
        }
    }

    public boolean isConfigured() {
        return !this.apiKey.isBlank();
    }

    @Override
    public void sendEmail(String to, String subject, String body, boolean isHtml) {
        if (!isConfigured()) {
            log.warn("Attempted to send email to {} but SENDGRID_API_KEY is not configured", to);
            throw new IllegalStateException(
                    "SendGrid email integration is not configured. Set SENDGRID_API_KEY in environment or .env.");
        }

        try {
            Map<String, Object> payload = Map.of(
                    "personalizations", List.of(Map.of("to", List.of(Map.of("email", to)))),
                    "from", Map.of("email", fromEmail, "name", fromName),
                    "subject", subject,
                    "content", List.of(Map.of("type", isHtml ? "text/html" : "text/plain", "value", body))
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SENDGRID_SEND_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();

            if (status >= 200 && status < 300) {
                log.info("Email sent successfully via SendGrid to: {}, subject: {}", to, subject);
            } else {
                log.error("SendGrid failed to send email (HTTP {}): {}", status, response.body());
                throw new IllegalStateException("SendGrid returned HTTP " + status + ": " + response.body());
            }
        } catch (Exception e) {
            log.error("Error sending email via SendGrid to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Failed to send email via SendGrid: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean testConnection() {
        if (!isConfigured()) {
            log.warn("SendGrid testConnection failed: SENDGRID_API_KEY is missing");
            return false;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SENDGRID_SCOPES_URL))
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            boolean ok = code == 200;
            if (ok) {
                log.info("SendGrid connection test PASSED");
            } else {
                log.warn("SendGrid connection test FAILED with HTTP {}: {}", code, response.body());
            }
            return ok;
        } catch (Exception e) {
            log.error("SendGrid connection test error: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String getProviderName() {
        return "SENDGRID";
    }
}
