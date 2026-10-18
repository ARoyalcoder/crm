package com.pawanputra.bos.finance.internal;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CollectionTaskRepository extends JpaRepository<CollectionTask, UUID> {

    /** Always scope by organization. */
    Optional<CollectionTask> findByIdAndOrganizationId(UUID id, UUID organizationId);

    /** All tasks for an organization, filtered by status or not. */
    Page<CollectionTask> findAllByOrganizationId(UUID organizationId, Pageable pageable);

    Page<CollectionTask> findAllByOrganizationIdAndStatus(
            UUID organizationId, CollectionTask.Status status, Pageable pageable);

    /**
     * Invoice IDs that already have an open or in-progress task in this organization.
     * Used by the automation job to avoid creating duplicate tasks.
     */
    @Query("select ct.invoiceId from CollectionTask ct "
            + "where ct.organizationId = :organizationId "
            + "and ct.status in :openStatuses")
    List<UUID> findInvoiceIdsWithOpenTasks(
            @Param("organizationId") UUID organizationId,
            @Param("openStatuses") Collection<CollectionTask.Status> openStatuses);
}
