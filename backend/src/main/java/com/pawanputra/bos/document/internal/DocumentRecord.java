package com.pawanputra.bos.document.internal;

import com.pawanputra.bos.document.api.DocumentCategory;
import com.pawanputra.bos.document.api.DocumentEntityType;
import com.pawanputra.bos.platform.persistence.SoftDeletableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

/**
 * A document or file attached to any business entity (customer, project, invoice, etc.).
 *
 * <p>The file bytes live in object storage (S3/MinIO); this record stores the metadata and the
 * storage key needed to retrieve them. Deletion is always soft: the row is marked {@code deleted_at}
 * and the file is left in storage until a background purge job runs.
 */
@Entity
@Table(name = "document_records")
@SQLRestriction(SoftDeletableEntity.NOT_DELETED)
public class DocumentRecord extends SoftDeletableEntity {

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, updatable = false, length = 30)
    private DocumentEntityType entityType;

    @Column(name = "entity_id", nullable = false, updatable = false)
    private UUID entityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private DocumentCategory category;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    /** The S3/MinIO object key. Never exposed directly to clients; they get presigned URLs. */
    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    /**
     * Document version number, incremented each time a new version is uploaded.
     * Not to be confused with the JPA optimistic-lock version in {@link com.pawanputra.bos.platform.persistence.AuditableEntity}.
     */
    @Column(name = "document_version", nullable = false)
    private int documentVersion = 1;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    /** Comma-separated tags or JSON array for flexible labelling. */
    @Column(name = "tags", columnDefinition = "text")
    private String tags;

    protected DocumentRecord() {
        // for JPA
    }

    public DocumentRecord(
            UUID organizationId,
            DocumentEntityType entityType,
            UUID entityId,
            DocumentCategory category,
            String title,
            String description,
            String storageKey,
            String originalFileName,
            String mimeType,
            long fileSizeBytes,
            UUID uploadedBy,
            String tags) {
        this.organizationId = organizationId;
        this.entityType = entityType;
        this.entityId = entityId;
        this.category = category;
        this.title = title;
        this.description = description;
        this.storageKey = storageKey;
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.fileSizeBytes = fileSizeBytes;
        this.uploadedBy = uploadedBy;
        this.tags = tags;
    }

    /** Updates the record when a new version of the file is uploaded. */
    public void applyNewVersion(String newStorageKey, String newOriginalFileName, long newFileSizeBytes) {
        this.storageKey = newStorageKey;
        this.originalFileName = newOriginalFileName;
        this.fileSizeBytes = newFileSizeBytes;
        this.documentVersion++;
    }

    // --- Getters ---

    public UUID getOrganizationId() {
        return organizationId;
    }

    public DocumentEntityType getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public DocumentCategory getCategory() {
        return category;
    }

    public void setCategory(DocumentCategory category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public int getDocumentVersion() {
        return documentVersion;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }
}
