package com.pawanputra.bos.integration.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.integration.api.WhatsAppProvider;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * WhatsApp message provider supporting both Twilio WhatsApp and Meta WhatsApp Cloud API.
 */
@Component
public class ConfigurableWhatsAppProvider implements WhatsAppProvider {

    private static final Logger log = LoggerFactory.getLogger(ConfigurableWhatsAppProvider.class);

    private final String provider;
    private final String twilioAccountSid;
    private final String twilioAuthToken;
    private final String twilioFrom;
    private final String metaPhoneNumberId;
    private final String metaAccessToken;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ConfigurableWhatsAppProvider(
            @Value("${app.integration.whatsapp.provider:twilio}") String provider,
            @Value("${app.integration.whatsapp.twilio.account-sid:}") String twilioAccountSid,
            @Value("${app.integration.whatsapp.twilio.auth-token:}") String twilioAuthToken,
            @Value("${app.integration.whatsapp.twilio.from-number:}") String twilioFrom,
            @Value("${app.integration.whatsapp.meta.phone-number-id:}") String metaPhoneNumberId,
            @Value("${app.integration.whatsapp.meta.access-token:}") String metaAccessToken,
            ObjectMapper objectMapper) {
        this.provider = provider != null ? provider.strip().toLowerCase() : "twilio";
        this.twilioAccountSid = twilioAccountSid != null ? twilioAccountSid.strip() : "";
        this.twilioAuthToken = twilioAuthToken != null ? twilioAuthToken.strip() : "";
        this.twilioFrom = twilioFrom != null ? twilioFrom.strip() : "";
        this.metaPhoneNumberId = metaPhoneNumberId != null ? metaPhoneNumberId.strip() : "";
        this.metaAccessToken = metaAccessToken != null ? metaAccessToken.strip() : "";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        if (isTwilioConfigured()) {
            log.info("WhatsApp integration active via Twilio (Account SID: {}, From: {})", mask(this.twilioAccountSid), this.twilioFrom);
        } else if (isMetaConfigured()) {
            log.info("WhatsApp integration active via Meta Cloud API (Phone ID: {})", mask(this.metaPhoneNumberId));
        } else {
            log.info("WhatsApp integration initialized without credentials (configure Twilio or Meta in .env)");
        }
    }

    public boolean isTwilioConfigured() {
        return !twilioAccountSid.isBlank() && !twilioAuthToken.isBlank();
    }

    public boolean isMetaConfigured() {
        return !metaPhoneNumberId.isBlank() && !metaAccessToken.isBlank();
    }

    public boolean isConfigured() {
        return isTwilioConfigured() || isMetaConfigured();
    }

    @Override
    public void sendMessage(String phoneNumber, String message) {
        if (!isConfigured()) {
            log.warn("Attempted to send WhatsApp message to {} but WhatsApp credentials are not configured", phoneNumber);
            throw new IllegalStateException(
                    "WhatsApp integration is not configured. Provide TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN or WHATSAPP_ACCESS_TOKEN in .env.");
        }

        if (isTwilioConfigured()) {
            sendViaTwilio(phoneNumber, message);
        } else {
            sendViaMeta(phoneNumber, message);
        }
    }

    private void sendViaTwilio(String phoneNumber, String message) {
        try {
            String toFormatted = phoneNumber.startsWith("whatsapp:") ? phoneNumber : "whatsapp:" + phoneNumber;
            String fromFormatted = twilioFrom.startsWith("whatsapp:") ? twilioFrom : "whatsapp:" + twilioFrom;

            String formBody = "From=" + URLEncoder.encode(fromFormatted, StandardCharsets.UTF_8)
                    + "&To=" + URLEncoder.encode(toFormatted, StandardCharsets.UTF_8)
                    + "&Body=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

            String auth = Base64.getEncoder().encodeToString((twilioAccountSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                log.info("WhatsApp message sent via Twilio to: {}", phoneNumber);
            } else {
                log.error("Twilio WhatsApp failed (HTTP {}): {}", status, response.body());
                throw new IllegalStateException("Twilio returned HTTP " + status + ": " + response.body());
            }
        } catch (Exception e) {
            log.error("Error sending WhatsApp via Twilio to {}: {}", phoneNumber, e.getMessage());
            throw new IllegalStateException("Failed to send WhatsApp message: " + e.getMessage(), e);
        }
    }

    private void sendViaMeta(String phoneNumber, String message) {
        try {
            String cleanNumber = phoneNumber.replace("whatsapp:", "").replace("+", "").replaceAll("\\s+", "");
            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", cleanNumber,
                    "type", "text",
                    "text", Map.of("preview_url", false, "body", message)
            );

            String json = objectMapper.writeValueAsString(payload);
            String url = "https://graph.facebook.com/v21.0/" + metaPhoneNumberId + "/messages";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + metaAccessToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                log.info("WhatsApp message sent via Meta Cloud API to: {}", phoneNumber);
            } else {
                log.error("Meta WhatsApp failed (HTTP {}): {}", status, response.body());
                throw new IllegalStateException("Meta Cloud API returned HTTP " + status + ": " + response.body());
            }
        } catch (Exception e) {
            log.error("Error sending WhatsApp via Meta to {}: {}", phoneNumber, e.getMessage());
            throw new IllegalStateException("Failed to send WhatsApp message: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean testConnection() {
        if (!isConfigured()) {
            log.warn("WhatsApp testConnection failed: no Twilio or Meta credentials found");
            return false;
        }

        if (isTwilioConfigured()) {
            try {
                String auth = Base64.getEncoder().encodeToString((twilioAccountSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));
                String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + ".json";
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Basic " + auth)
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                boolean ok = response.statusCode() == 200;
                if (ok) log.info("Twilio WhatsApp connection test PASSED");
                else log.warn("Twilio WhatsApp connection test FAILED (HTTP {}): {}", response.statusCode(), response.body());
                return ok;
            } catch (Exception e) {
                log.error("Twilio test error: {}", e.getMessage());
                return false;
            }
        }

        if (isMetaConfigured()) {
            try {
                String url = "https://graph.facebook.com/v21.0/" + metaPhoneNumberId;
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + metaAccessToken)
                        .timeout(Duration.ofSeconds(10))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                boolean ok = response.statusCode() == 200;
                if (ok) log.info("Meta WhatsApp connection test PASSED");
                else log.warn("Meta WhatsApp connection test FAILED (HTTP {}): {}", response.statusCode(), response.body());
                return ok;
            } catch (Exception e) {
                log.error("Meta test error: {}", e.getMessage());
                return false;
            }
        }

        return false;
    }

    @Override
    public String getProviderName() {
        if (isMetaConfigured()) return "META_CLOUD_API";
        return "TWILIO";
    }

    private static String mask(String value) {
        if (value == null || value.length() < 6) return "***";
        return value.substring(0, 3) + "..." + value.substring(value.length() - 3);
    }
}
