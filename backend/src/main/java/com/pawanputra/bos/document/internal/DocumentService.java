package com.pawanputra.bos.document.internal;

import com.pawanputra.bos.document.api.DocumentCategory;
import com.pawanputra.bos.document.api.DocumentEntityType;
import com.pawanputra.bos.document.internal.DocumentDtos.DownloadUrlView;
import com.pawanputra.bos.document.internal.DocumentDtos.StorageSummary;
import com.pawanputra.bos.platform.error.ApiException;
import com.pawanputra.bos.platform.error.ErrorCode;
import com.pawanputra.bos.platform.storage.ObjectStorage;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Domain logic for the document management module.
 *
 * <p>Validation rules enforced here:
 * <ul>
 *   <li>Max file size: 50 MB</li>
 *   <li>Allowed MIME types: PDF, Word, Excel, PowerPoint, images, ZIP, plain text, CSV</li>
 *   <li>Storage key format: {@code documents/{orgId}/{entityType}/{entityId}/{uuid}.{ext}}</li>
 *   <li>Deletes are always soft (DB only); S3 objects are left for a future purge job</li>
 * </ul>
 */
@Service
@Transactional
public class DocumentService {

    static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB

    static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/svg+xml",
            "application/zip",
            "text/plain",
            "text/csv");

    private static final Duration DOWNLOAD_URL_TTL = Duration.ofMinutes(15);

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final ObjectStorage objectStorage;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentVersionRepository versionRepository,
            ObjectStorage objectStorage) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.objectStorage = objectStorage;
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    /**
     * Validates and stores a new document, then persists its metadata.
     *
     * @return the saved {@link DocumentRecord}
     */
    public DocumentRecord upload(
            DocumentEntityType entityType,
            UUID entityId,
            MultipartFile file,
            DocumentCategory category,
            String title,
            String description,
            String tags,
            UUID uploadedBy,
            UUID orgId) {

        validateFile(file);

        String storageKey = buildStorageKey(orgId, entityType, entityId, file.getOriginalFilename());

        try (InputStream stream = file.getInputStream()) {
            objectStorage.put(storageKey, stream, file.getSize(), resolvedContentType(file));
        } catch (IOException e) {
            throw new ApiException(ErrorCode.MALFORMED_REQUEST, "Could not read the uploaded file", e);
        }

        DocumentRecord record = new DocumentRecord(
                orgId,
                entityType,
                entityId,
                category,
                title,
                description,
                storageKey,
                file.getOriginalFilename(),
                resolvedContentType(file),
                file.getSize(),
                uploadedBy,
                tags);

        return documentRepository.save(record);
    }

    /**
     * Uploads a replacement file as a new version of an existing document.
     *
     * <p>The previous storageKey is archived in {@link DocumentVersion}; the parent record is
     * updated with the new file's details and its version counter is incremented.
     *
     * @return the updated {@link DocumentRecord}
     */
    public DocumentRecord uploadNewVersion(
            UUID documentId,
            MultipartFile file,
            String notes,
            UUID uploadedBy,
            UUID orgId) {

        DocumentRecord record = requireDocument(documentId, orgId);
        validateFile(file);

        // Archive current version
        DocumentVersion archivedVersion = new DocumentVersion(
                record.getId(),
                record.getDocumentVersion(),
                record.getStorageKey(),
                record.getOriginalFileName(),
                record.getFileSizeBytes(),
                record.getUploadedBy(),
                record.getUpdatedAt() != null ? record.getUpdatedAt() : Instant.now(),
                notes);
        versionRepository.save(archivedVersion);

        // Upload new file to a new key
        String newStorageKey = buildStorageKey(orgId, record.getEntityType(), record.getEntityId(),
                file.getOriginalFilename());

        try (InputStream stream = file.getInputStream()) {
            objectStorage.put(newStorageKey, stream, file.getSize(), resolvedContentType(file));
        } catch (IOException e) {
            throw new ApiException(ErrorCode.MALFORMED_REQUEST, "Could not read the uploaded file", e);
        }

        record.applyNewVersion(newStorageKey, file.getOriginalFilename(), file.getSize());
        return documentRepository.save(record);
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<DocumentRecord> listByEntity(DocumentEntityType entityType, UUID entityId, UUID orgId) {
        return documentRepository.findAllByEntityTypeAndEntityIdAndOrganizationIdOrderByCreatedAtDesc(
                entityType, entityId, orgId);
    }

    @Transactional(readOnly = true)
    public DocumentRecord getById(UUID id, UUID orgId) {
        return requireDocument(id, orgId);
    }

    @Transactional(readOnly = true)
    public List<DocumentRecord> listByOrganization(UUID orgId) {
        return documentRepository.findAllByOrganizationIdOrderByCreatedAtDesc(orgId);
    }

    @Transactional(readOnly = true)
    public List<DocumentRecord> listByOrganizationAndEntityType(DocumentEntityType entityType, UUID orgId) {
        return documentRepository.findAllByEntityTypeAndOrganizationIdOrderByCreatedAtDesc(entityType, orgId);
    }

    @Transactional(readOnly = true)
    public List<DocumentRecord> listByUploader(UUID uploadedBy, UUID orgId) {
        return documentRepository.findAllByUploadedByAndOrganizationIdOrderByCreatedAtDesc(uploadedBy, orgId);
    }

    /**
     * Generates a short-lived presigned download URL for the document.
     *
     * @return a {@link DownloadUrlView} containing the URL and expiry time
     */
    @Transactional(readOnly = true)
    public DownloadUrlView generateDownloadUrl(UUID id, UUID orgId) {
        DocumentRecord record = requireDocument(id, orgId);
        URI presigned = objectStorage.presignedDownloadUrl(record.getStorageKey(), DOWNLOAD_URL_TTL);
        return new DownloadUrlView(presigned.toString(), Instant.now().plus(DOWNLOAD_URL_TTL));
    }

    @Transactional(readOnly = true)
    public List<DocumentVersion> getVersionHistory(UUID documentId, UUID orgId) {
        requireDocument(documentId, orgId); // access check
        return versionRepository.findAllByDocumentIdOrderByVersionNumberAsc(documentId);
    }

    @Transactional(readOnly = true)
    public StorageSummary getStorageSummary(UUID orgId) {
        // An aggregate with no GROUP BY always yields exactly one row.
        Object[] row = documentRepository.storageSummary(orgId).get(0);
        long count = ((Number) row[0]).longValue();
        long totalBytes = ((Number) row[1]).longValue();
        return new StorageSummary(count, totalBytes);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Soft-deletes a document. The S3 object is NOT removed immediately; a scheduled purge job
     * should clean up orphaned objects periodically.
     */
    public void delete(UUID id, UUID orgId) {
        DocumentRecord record = requireDocument(id, orgId);
        record.markDeleted(Instant.now());
        documentRepository.save(record);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private DocumentRecord requireDocument(UUID id, UUID orgId) {
        return documentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Document not found: " + id));
    }

    private static void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "No file was provided");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE,
                    "File exceeds the maximum allowed size of 50 MB");
        }
        String mimeType = resolvedContentType(file);
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                    "File type '" + mimeType + "' is not allowed. "
                            + "Supported types: PDF, Word, Excel, PowerPoint, images (PNG/JPG/GIF/SVG), ZIP, text, CSV");
        }
    }

    private static String resolvedContentType(MultipartFile file) {
        String ct = file.getContentType();
        return ct != null ? ct : "application/octet-stream";
    }

    private static String buildStorageKey(UUID orgId, DocumentEntityType entityType, UUID entityId,
            String originalFileName) {
        String ext = fileExtension(originalFileName);
        return "documents/" + orgId + "/" + entityType.name().toLowerCase()
                + "/" + entityId + "/" + UUID.randomUUID() + ext;
    }

    private static String fileExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}
