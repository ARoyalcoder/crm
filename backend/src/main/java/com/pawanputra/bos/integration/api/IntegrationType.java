package com.pawanputra.bos.integration.api;

/**
 * Every external integration type the platform recognises. Each type maps to at most one
 * {@code IntegrationConfig} row per organisation.
 */
public enum IntegrationType {
    EMAIL,
    WHATSAPP,
    GOOGLE_DRIVE,
    CALENDAR,
    PAYMENT_GATEWAY,
    MAPS,
    OBJECT_STORAGE,
    WEBHOOK
}
