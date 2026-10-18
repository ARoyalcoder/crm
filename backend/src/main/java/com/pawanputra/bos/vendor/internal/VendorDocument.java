package com.pawanputra.bos.vendor.internal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Metadata for a file attached to a vendor (contract, certificate, invoice, etc.).
 * The actual file bytes are stored externally; this record holds only the reference key.
 */
@Entity
@Table(name = "vendor_documents")
public class VendorDocument {

    @jakarta.persistence.Id
    private UUID id;

    @Column(name = "vendor_id", nullable = false, updatable = false)
    private UUID vendorId;

    /** One of CONTRACT, CERTIFICATE, INVOICE, OTHER. */
    @Column(name = "document_type", nullable = false, length = 30)
    private String documentType;

    @Column(name = "file_name", nullable = false, length = 300)
    private String fileName;

    /** The opaque key used to retrieve the file from external storage. */
    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploaded_by", nullable = false, length = 100)
    private String uploadedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected VendorDocument() {
        // for JPA
    }

    public VendorDocument(UUID vendorId, String documentType, String fileName,
                          String storageKey, String mimeType, Long fileSize, String uploadedBy) {
        this.id = UUID.randomUUID();
        this.vendorId = vendorId;
        this.documentType = documentType;
        this.fileName = fileName;
        this.storageKey = storageKey;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.uploadedBy = uploadedBy;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getVendorId() { return vendorId; }
    public String getDocumentType() { return documentType; }
    public String getFileName() { return fileName; }
    public String getStorageKey() { return storageKey; }
    public String getMimeType() { return mimeType; }
    public Long getFileSize() { return fileSize; }
    public String getUploadedBy() { return uploadedBy; }
    public Instant getCreatedAt() { return createdAt; }
}
