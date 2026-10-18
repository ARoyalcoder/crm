package com.pawanputra.bos.document.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable snapshot of a previous version of a {@link DocumentRecord}.
 *
 * <p>Each time a new file is uploaded for an existing document, the current storage key and metadata
 * are written here before the parent record is updated. This enables full version history without
 * storing duplicate file bytes (every version has its own storage key).
 */
@Entity
@Table(name = "document_versions")
public class DocumentVersion extends BaseEntity {

    @Column(name = "document_id", nullable = false, updatable = false)
    private UUID documentId;

    @Column(name = "version_number", nullable = false, updatable = false)
    private int versionNumber;

    @Column(name = "storage_key", nullable = false, updatable = false, length = 500)
    private String storageKey;

    @Column(name = "original_file_name", nullable = false, updatable = false, length = 255)
    private String originalFileName;

    @Column(name = "file_size_bytes", nullable = false, updatable = false)
    private long fileSizeBytes;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private Instant uploadedAt;

    /** Optional change notes recorded when uploading this version. */
    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    protected DocumentVersion() {
        // for JPA
    }

    public DocumentVersion(
            UUID documentId,
            int versionNumber,
            String storageKey,
            String originalFileName,
            long fileSizeBytes,
            UUID uploadedBy,
            Instant uploadedAt,
            String notes) {
        this.documentId = documentId;
        this.versionNumber = versionNumber;
        this.storageKey = storageKey;
        this.originalFileName = originalFileName;
        this.fileSizeBytes = fileSizeBytes;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = uploadedAt;
        this.notes = notes;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public String getNotes() {
        return notes;
    }
}
