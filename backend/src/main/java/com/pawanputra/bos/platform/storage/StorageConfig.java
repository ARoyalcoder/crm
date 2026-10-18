package com.pawanputra.bos.platform.storage;

import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** Builds the storage service bean, choosing Cloudinary or S3 based on configuration. */
@Configuration
@EnableConfigurationProperties({StorageProperties.class, CloudinaryProperties.class})
public class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    ObjectStorage objectStorage(StorageProperties properties, CloudinaryProperties cloudinaryProperties) {
        if (cloudinaryProperties.isConfigured() || "cloudinary".equalsIgnoreCase(properties.provider())) {
            log.info("Using Cloudinary for object storage (cloud: {}, folder: {})",
                    cloudinaryProperties.cloudName(), cloudinaryProperties.folder());
            return new CloudinaryObjectStorage(cloudinaryProperties);
        }

        log.info("Using S3/MinIO for object storage (bucket: {})", properties.bucket());
        URI endpoint = properties.endpoint() != null ? properties.endpoint() : URI.create("http://localhost:9000");
        String region = properties.region() != null && !properties.region().isBlank() ? properties.region() : "us-east-1";
        String bucket = properties.bucket() != null && !properties.bucket().isBlank() ? properties.bucket() : "bos-local";

        S3Client client = S3Client.builder()
                .endpointOverride(endpoint)
                .region(Region.of(region))
                .credentialsProvider(credentials(properties))
                .forcePathStyle(properties.pathStyleAccess())
                .build();

        S3Presigner presigner = S3Presigner.builder()
                .endpointOverride(endpoint)
                .region(Region.of(region))
                .credentialsProvider(credentials(properties))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(properties.pathStyleAccess())
                        .build())
                .build();

        return new S3ObjectStorage(client, presigner, bucket);
    }

    private static StaticCredentialsProvider credentials(StorageProperties properties) {
        String accessKey = properties.accessKey() != null ? properties.accessKey() : "bos_minio";
        String secretKey = properties.secretKey() != null ? properties.secretKey() : "bos_minio_local_dev";
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
    }
}
