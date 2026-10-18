package com.pawanputra.bos.platform.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * {@link ObjectStorage} implementation backed by Cloudinary.
 */
class CloudinaryObjectStorage implements ObjectStorage {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryObjectStorage.class);

    private final Cloudinary cloudinary;
    private final String folder;

    CloudinaryObjectStorage(CloudinaryProperties properties) {
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", properties.cloudName());
        config.put("api_key", properties.apiKey());
        config.put("api_secret", properties.apiSecret());
        config.put("secure", "true");
        this.cloudinary = new Cloudinary(config);
        this.folder = properties.folder() != null ? properties.folder().trim() : "";
        log.info("Initialized CloudinaryObjectStorage for cloud: {}, folder: {}", properties.cloudName(), this.folder);
    }

    CloudinaryObjectStorage(Cloudinary cloudinary, String folder) {
        this.cloudinary = cloudinary;
        this.folder = folder != null ? folder.trim() : "";
    }

    @Override
    public void put(String key, InputStream content, long contentLength, String contentType) {
        try {
            byte[] bytes = content.readAllBytes();
            String publicId = toPublicId(key);
            String resourceType = resolveResourceType(contentType, key);

            Map<String, Object> params = new HashMap<>();
            params.put("public_id", publicId);
            params.put("resource_type", resourceType);
            params.put("overwrite", true);
            params.put("use_filename", false);
            params.put("unique_filename", false);

            Map<?, ?> result = cloudinary.uploader().upload(bytes, params);
            log.debug("Uploaded object to Cloudinary: {} (public_id: {}) -> {}", key, publicId, result.get("secure_url"));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to upload object to Cloudinary: " + key, e);
        }
    }

    @Override
    public InputStream get(String key) {
        try {
            URI url = presignedDownloadUrl(key, Duration.ofMinutes(15));
            HttpURLConnection conn = (HttpURLConnection) url.toURL().openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new IllegalStateException("Cloudinary returned HTTP " + code + " for key: " + key);
            }
            return conn.getInputStream();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read object from Cloudinary: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        try {
            URI url = presignedDownloadUrl(key, Duration.ofMinutes(5));
            HttpURLConnection conn = (HttpURLConnection) url.toURL().openConnection();
            conn.setRequestMethod("HEAD");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            int code = conn.getResponseCode();
            return code >= 200 && code < 400;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void delete(String key) {
        String publicId = toPublicId(key);
        try {
            String resourceType = resolveResourceType(null, key);
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType, "invalidate", true));
        } catch (Exception e) {
            log.warn("Cloudinary delete ignored error for key {}: {}", key, e.getMessage());
        }
    }

    @Override
    public URI presignedDownloadUrl(String key, Duration validFor) {
        String publicId = toPublicId(key);
        String resourceType = resolveResourceType(null, key);
        String url = cloudinary.url()
                .secure(true)
                .resourceType(resourceType)
                .generate(publicId);
        return URI.create(url);
    }

    private String toPublicId(String key) {
        if (key == null) return "";
        String cleanKey = key.startsWith("/") ? key.substring(1) : key;
        if (folder != null && !folder.isBlank()) {
            if (cleanKey.startsWith(folder + "/")) {
                return cleanKey;
            }
            return folder + "/" + cleanKey;
        }
        return cleanKey;
    }

    private String resolveResourceType(String contentType, String key) {
        if (contentType != null && !contentType.isBlank()) {
            if (contentType.startsWith("image/")) return "image";
            if (contentType.startsWith("video/")) return "video";
            if (contentType.startsWith("audio/")) return "video";
        }
        if (key != null) {
            String lower = key.toLowerCase();
            if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                    || lower.endsWith(".gif") || lower.endsWith(".webp") || lower.endsWith(".svg")) {
                return "image";
            }
            if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".webm")) {
                return "video";
            }
        }
        return "raw";
    }
}
