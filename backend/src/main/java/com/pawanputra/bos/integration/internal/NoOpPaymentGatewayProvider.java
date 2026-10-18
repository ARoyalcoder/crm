package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.PaymentGatewayProvider;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * No-op payment gateway provider. Active when no real {@link PaymentGatewayProvider} bean is
 * configured.
 *
 * <p>All methods log a warning and throw {@link UnsupportedOperationException} so callers fail
 * loudly rather than silently allowing unpaid orders through.
 */
@Component
@ConditionalOnMissingBean(value = PaymentGatewayProvider.class, ignored = NoOpPaymentGatewayProvider.class)
public class NoOpPaymentGatewayProvider implements PaymentGatewayProvider {

    private static final Logger log = LoggerFactory.getLogger(NoOpPaymentGatewayProvider.class);

    @Override
    public String initiatePayment(String orderId, BigDecimal amount, String currency,
            String callbackUrl) {
        log.warn("Provider not configured: PAYMENT_GATEWAY");
        throw new UnsupportedOperationException(
                "Payment gateway integration is not configured. Add a PaymentGatewayProvider bean (e.g. Razorpay, Stripe).");
    }

    @Override
    public boolean verifyPayment(String paymentId, String signature) {
        log.warn("Provider not configured: PAYMENT_GATEWAY");
        throw new UnsupportedOperationException(
                "Payment gateway integration is not configured. Add a PaymentGatewayProvider bean (e.g. Razorpay, Stripe).");
    }

    @Override
    public boolean testConnection() {
        log.warn("Provider not configured: PAYMENT_GATEWAY");
        return false;
    }

    @Override
    public String getProviderName() {
        return "NOT_CONFIGURED";
    }
}
