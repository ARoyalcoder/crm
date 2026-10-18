package com.pawanputra.bos.integration.api;

/**
 * Provider contract for outbound email delivery.
 *
 * <p>Implementations live in feature modules that depend on this interface only; the platform
 * never imports a concrete provider.
 */
public interface EmailProvider {

    /**
     * Sends a single email.
     *
     * @param to      recipient address
     * @param subject email subject line
     * @param body    email body
     * @param isHtml  {@code true} for HTML content, {@code false} for plain text
     */
    void sendEmail(String to, String subject, String body, boolean isHtml);

    /** Returns {@code true} if the provider can currently reach its upstream service. */
    boolean testConnection();

    /** Human-readable provider name, e.g. {@code "SENDGRID"}, {@code "SMTP"}. */
    String getProviderName();
}
