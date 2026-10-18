package com.pawanputra.bos.document.internal;

import com.pawanputra.bos.document.api.DocumentCategory;
import com.pawanputra.bos.document.api.DocumentEntityType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** All DTOs for the document management module. */
public final class DocumentDtos {

    private DocumentDtos() {
    }

    /** Full document metadata returned to the client. The storage key is never included. */
    public record DocumentView(
            UUID id,
            UUID organizationId,
            DocumentEntityType entityType,
            UUID entityId,
            DocumentCategory category,
            String title,
            String description,
            String originalFileName,
            String mimeType,
            long fileSizeBytes,
            int documentVersion,
            UUID uploadedBy,
            String uploadedByName,
            String tags,
            Instant createdAt,
            Instant updatedAt) {
    }

    /** Summary of a historical version entry. */
    public record DocumentVersionView(
            UUID id,
            UUID documentId,
            int versionNumber,
            String originalFileName,
            long fileSizeBytes,
            UUID uploadedBy,
            String uploadedByName,
            Instant uploadedAt,
            String notes) {
    }

    /** Request body / params for the initial upload. */
    public record UploadRequest(
            DocumentEntityType entityType,
            UUID entityId,
            DocumentCategory category,
            String title,
            String description,
            String tags) {
    }

    /** Request params for uploading a new version. */
    public record NewVersionRequest(String notes) {
    }

    /** Response when the caller requests a download URL. */
    public record DownloadUrlView(String url, Instant expiresAt) {
    }

    /** Summary statistics for an organisation's document storage. */
    public record StorageSummary(long totalFiles, long totalSizeBytes) {
    }

    /** Org-wide document list row (includes entity context for the browser page). */
    public record DocumentListItem(
            UUID id,
            DocumentEntityType entityType,
            UUID entityId,
            DocumentCategory category,
            String title,
            String originalFileName,
            String mimeType,
            long fileSizeBytes,
            int documentVersion,
            UUID uploadedBy,
            String uploadedByName,
            Instant createdAt) {
    }

    // Factory helpers to keep controller / service thin -----------------------

    public static DocumentView toView(DocumentRecord r, String uploadedByName) {
        return new DocumentView(
                r.getId(),
                r.getOrganizationId(),
                r.getEntityType(),
                r.getEntityId(),
                r.getCategory(),
                r.getTitle(),
                r.getDescription(),
                r.getOriginalFileName(),
                r.getMimeType(),
                r.getFileSizeBytes(),
                r.getDocumentVersion(),
                r.getUploadedBy(),
                uploadedByName,
                r.getTags(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    public static DocumentVersionView toVersionView(DocumentVersion v, String uploadedByName) {
        return new DocumentVersionView(
                v.getId(),
                v.getDocumentId(),
                v.getVersionNumber(),
                v.getOriginalFileName(),
                v.getFileSizeBytes(),
                v.getUploadedBy(),
                uploadedByName,
                v.getUploadedAt(),
                v.getNotes());
    }

    public static List<DocumentListItem> toListItems(List<DocumentRecord> records, Map<UUID, String> names) {
        return records.stream().map(r -> toListItem(r, names.get(r.getUploadedBy()))).toList();
    }

    private static DocumentListItem toListItem(DocumentRecord r, String uploadedByName) {
        return new DocumentListItem(
                r.getId(),
                r.getEntityType(),
                r.getEntityId(),
                r.getCategory(),
                r.getTitle(),
                r.getOriginalFileName(),
                r.getMimeType(),
                r.getFileSizeBytes(),
                r.getDocumentVersion(),
                r.getUploadedBy(),
                uploadedByName,
                r.getCreatedAt());
    }
}
