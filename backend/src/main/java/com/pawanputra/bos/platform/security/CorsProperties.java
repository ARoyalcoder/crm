package com.pawanputra.bos.platform.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param allowedOrigins exact browser origins allowed to call the API; empty disables cross-origin access
 */
@ConfigurationProperties("app.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        List<String> cleaned = allowedOrigins == null ? List.of() : allowedOrigins.stream().filter(s -> s != null && !s.isBlank()).toList();
        allowedOrigins = cleaned.isEmpty() ? List.of("*") : cleaned;
    }
}
