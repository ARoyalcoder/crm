package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

/** A file attached to a support ticket, stored via the object-storage abstraction. */
@Entity
@Table(name = "ticket_attachments")
public class TicketAttachment extends BaseEntity {

    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_key", nullable = false, length = 300)
    private String storageKey;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "uploaded_by_id", nullable = false, updatable = false)
    private UUID uploadedById;

    @Column(name = "uploaded_by_name", nullable = false, updatable = false, length = 200)
    private String uploadedByName;

    protected TicketAttachment() {
        // for JPA
    }

    public TicketAttachment(UUID ticketId, String fileName, String storageKey, String mimeType,
            long fileSize, UUID uploadedById, String uploadedByName) {
        this.ticketId = ticketId;
        this.fileName = fileName;
        this.storageKey = storageKey;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.uploadedById = uploadedById;
        this.uploadedByName = uploadedByName;
    }

    public UUID getTicketId() {
        return ticketId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public UUID getUploadedById() {
        return uploadedById;
    }

    public String getUploadedByName() {
        return uploadedByName;
    }
}
