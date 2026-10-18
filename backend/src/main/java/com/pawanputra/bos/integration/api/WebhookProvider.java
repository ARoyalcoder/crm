package com.pawanputra.bos.integration.api;

/**
 * Provider contract for dispatching outbound webhooks.
 *
 * <p>Implementations live in feature modules that depend on this interface only; the platform
 * never imports a concrete provider.
 */
public interface WebhookProvider {

    /**
     * Dispatches a webhook to the target URL.
     *
     * @param url       the recipient endpoint URL
     * @param secret    shared secret used to sign the payload (HMAC-SHA256)
     * @param eventType the event type name, included in the request headers
     * @param payload   the JSON payload to deliver
     */
    void dispatch(String url, String secret, String eventType, String payload);

    /** Returns {@code true} if the provider can currently reach its upstream service. */
    boolean testConnection();

    /** Human-readable provider name, e.g. {@code "HTTP_WEBHOOK"}. */
    String getProviderName();
}
