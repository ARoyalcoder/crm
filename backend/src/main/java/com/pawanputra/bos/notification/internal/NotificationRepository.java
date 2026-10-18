package com.pawanputra.bos.notification.internal;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /** Unread notifications for a user, newest first. Limited to 50 entries for the bell. */
    List<Notification> findAllByRecipientUserIdAndOrganizationIdAndReadFalseOrderByCreatedAtDesc(
            UUID recipientUserId, UUID organizationId, Pageable pageable);

    /** All notifications for a user, paginated — for the full notification center page. */
    Page<Notification> findAllByRecipientUserIdAndOrganizationIdOrderByCreatedAtDesc(
            UUID recipientUserId, UUID organizationId, Pageable pageable);

    /** Count of unread notifications for the bell badge. */
    long countByRecipientUserIdAndOrganizationIdAndReadFalse(UUID recipientUserId, UUID organizationId);

    Optional<Notification> findByIdAndRecipientUserId(UUID id, UUID recipientUserId);

    /** Bulk mark-all-read: updates every unread notification for the user in one query. */
    @Modifying
    @Query("""
            UPDATE Notification n
            SET n.read = true, n.readAt = :now
            WHERE n.recipientUserId = :userId
              AND n.organizationId = :orgId
              AND n.read = false
            """)
    int markAllReadForUser(
            @Param("userId") UUID userId,
            @Param("orgId") UUID organizationId,
            @Param("now") Instant now);
}
