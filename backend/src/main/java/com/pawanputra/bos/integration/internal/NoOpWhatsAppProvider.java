package com.pawanputra.bos.integration.internal;

import com.pawanputra.bos.integration.api.WhatsAppProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

/**
 * No-op WhatsApp provider. Active when no real {@link WhatsAppProvider} bean is configured.
 *
 * <p>All methods log a warning and throw {@link UnsupportedOperationException} so callers fail
 * loudly rather than silently dropping messages.
 */
@Component
@ConditionalOnMissingBean(value = WhatsAppProvider.class, ignored = NoOpWhatsAppProvider.class)
public class NoOpWhatsAppProvider implements WhatsAppProvider {

    private static final Logger log = LoggerFactory.getLogger(NoOpWhatsAppProvider.class);

    @Override
    public void sendMessage(String phoneNumber, String message) {
        log.warn("Provider not configured: WHATSAPP");
        throw new UnsupportedOperationException(
                "WhatsApp integration is not configured. Add a WhatsAppProvider bean (e.g. Twilio, Meta Cloud API).");
    }

    @Override
    public boolean testConnection() {
        log.warn("Provider not configured: WHATSAPP");
        return false;
    }

    @Override
    public String getProviderName() {
        return "NOT_CONFIGURED";
    }
}
