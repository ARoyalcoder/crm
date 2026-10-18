package com.pawanputra.bos.platform.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cloudinary credentials and folder configuration.
 *
 * @param cloudName     Cloudinary Cloud Name
 * @param apiKey        Cloudinary API Key
 * @param apiSecret     Cloudinary API Secret
 * @param folder        Default folder for uploaded assets (e.g. instagram-news)
 */
@ConfigurationProperties("app.storage.cloudinary")
public record CloudinaryProperties(
        String cloudName,
        String apiKey,
        String apiSecret,
        String folder) {

    public boolean isConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }
}
