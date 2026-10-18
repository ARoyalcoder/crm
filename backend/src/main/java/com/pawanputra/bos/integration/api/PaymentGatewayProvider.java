package com.pawanputra.bos.integration.api;

import java.math.BigDecimal;

/**
 * Provider contract for payment gateway integration.
 *
 * <p>Implementations live in feature modules that depend on this interface only; the platform
 * never imports a concrete provider.
 */
public interface PaymentGatewayProvider {

    /**
     * Initiates a payment and returns the provider-assigned payment URL or token.
     *
     * @param orderId     the application's order identifier
     * @param amount      the amount to charge
     * @param currency    ISO 4217 currency code, e.g. {@code "INR"}
     * @param callbackUrl the URL the gateway will redirect to after payment
     * @return a payment URL or session token the caller should redirect the user to
     */
    String initiatePayment(String orderId, BigDecimal amount, String currency, String callbackUrl);

    /**
     * Verifies a payment using the provider's signature or hash.
     *
     * @param paymentId provider-assigned payment ID
     * @param signature verification signature from the provider's webhook/redirect
     * @return {@code true} if the payment is genuine and successful
     */
    boolean verifyPayment(String paymentId, String signature);

    /** Returns {@code true} if the provider can currently reach its upstream service. */
    boolean testConnection();

    /** Human-readable provider name, e.g. {@code "RAZORPAY"}, {@code "STRIPE"}. */
    String getProviderName();
}
