package com.pawanputra.bos.integration.api;

/** The connectivity / configuration state of an external integration. */
public enum IntegrationStatus {
    /** Credentials supplied and last test passed. */
    CONNECTED,
    /** Credentials supplied but integration was explicitly disabled. */
    DISCONNECTED,
    /** Last test failed; {@code lastError} holds the message. */
    ERROR,
    /** A test is currently in progress. */
    PENDING,
    /** No credentials have ever been provided. */
    NOT_CONFIGURED
}
