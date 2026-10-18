package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.EmailProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * No-op email provider. Active when no real {@link EmailProvider} bean is configured.
 *
 * <p>All methods log a warning and throw {@link UnsupportedOperationException} so callers fail
 * loudly rather than silently dropping emails.
 */
@Component
@ConditionalOnMissingBean(value = EmailProvider.class, ignored = NoOpEmailProvider.class)
public class NoOpEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(NoOpEmailProvider.class);

    @Override
    public void sendEmail(String to, String subject, String body, boolean isHtml) {
        log.warn("Provider not configured: EMAIL");
        throw new UnsupportedOperationException(
                "Email integration is not configured. Add an EmailProvider bean (e.g. SendGrid, SMTP).");
    }

    @Override
    public boolean testConnection() {
        log.warn("Provider not configured: EMAIL");
        return false;
    }

    @Override
    public String getProviderName() {
        return "NOT_CONFIGURED";
    }
}
