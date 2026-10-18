package com.pawanputra.bos.document.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {

    /** All historical versions for a document, oldest first. */
    List<DocumentVersion> findAllByDocumentIdOrderByVersionNumberAsc(UUID documentId);
}
