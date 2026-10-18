package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.WebhookProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * No-op webhook provider. Active when no real {@link WebhookProvider} bean is configured.
 *
 * <p>All methods log a warning and throw {@link UnsupportedOperationException} so callers fail
 * loudly rather than silently dropping webhook deliveries.
 */
@Component
@ConditionalOnMissingBean(value = WebhookProvider.class, ignored = NoOpWebhookProvider.class)
public class NoOpWebhookProvider implements WebhookProvider {

    private static final Logger log = LoggerFactory.getLogger(NoOpWebhookProvider.class);

    @Override
    public void dispatch(String url, String secret, String eventType, String payload) {
        log.warn("Provider not configured: WEBHOOK");
        throw new UnsupportedOperationException(
                "Webhook integration is not configured. Add a WebhookProvider bean.");
    }

    @Override
    public boolean testConnection() {
        log.warn("Provider not configured: WEBHOOK");
        return false;
    }

    @Override
    public String getProviderName() {
        return "NOT_CONFIGURED";
    }
}
