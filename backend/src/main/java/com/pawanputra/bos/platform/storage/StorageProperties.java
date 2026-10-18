package com.pawanputra.bos.platform.storage;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Storage configuration properties for S3 / Cloudinary.
 *
 * @param provider        storage provider type: "cloudinary" or "s3"
 * @param endpoint        base URL of the S3-compatible service (MinIO locally)
 * @param region          S3 region
 * @param bucket          S3 bucket name
 * @param accessKey       S3 access key
 * @param secretKey       S3 secret key
 * @param pathStyleAccess path style access flag
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(
        String provider,
        URI endpoint,
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        boolean pathStyleAccess) {
}
