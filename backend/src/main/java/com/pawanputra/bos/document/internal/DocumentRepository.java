package com.pawanputra.bos.document.internal;

import com.pawanputra.bos.document.api.DocumentEntityType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DocumentRepository extends JpaRepository<DocumentRecord, UUID> {

    /** Always scope by organisation; a document of another org must be invisible. */
    Optional<DocumentRecord> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** All (non-deleted) documents for a specific entity, newest first. */
    List<DocumentRecord> findAllByEntityTypeAndEntityIdAndOrganizationIdOrderByCreatedAtDesc(
            DocumentEntityType entityType, UUID entityId, UUID organizationId);

    /** All documents uploaded by a specific user in this organisation, newest first. */
    List<DocumentRecord> findAllByUploadedByAndOrganizationIdOrderByCreatedAtDesc(
            UUID uploadedBy, UUID organizationId);

    /** All documents in an organisation with optional entity-type filter, newest first. */
    List<DocumentRecord> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<DocumentRecord> findAllByEntityTypeAndOrganizationIdOrderByCreatedAtDesc(
            DocumentEntityType entityType, UUID organizationId);

    /** Total file count and size for an organisation (non-deleted only). */
    @Query("SELECT COUNT(d), COALESCE(SUM(d.fileSizeBytes), 0) FROM DocumentRecord d WHERE d.organizationId = :orgId")
    List<Object[]> storageSummary(UUID orgId);
}
