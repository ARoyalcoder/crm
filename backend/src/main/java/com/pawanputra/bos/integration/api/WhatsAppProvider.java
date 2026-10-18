package com.pawanputra.bos.integration.api;

/**
 * Provider contract for sending WhatsApp messages.
 *
 * <p>Implementations live in feature modules that depend on this interface only; the platform
 * never imports a concrete provider.
 */
public interface WhatsAppProvider {

    /**
     * Sends a WhatsApp message to the given phone number.
     *
     * @param phoneNumber recipient phone number in E.164 format, e.g. {@code "+919876543210"}
     * @param message     message text
     */
    void sendMessage(String phoneNumber, String message);

    /** Returns {@code true} if the provider can currently reach its upstream service. */
    boolean testConnection();

    /** Human-readable provider name, e.g. {@code "TWILIO"}, {@code "META_CLOUD_API"}. */
    String getProviderName();
}
