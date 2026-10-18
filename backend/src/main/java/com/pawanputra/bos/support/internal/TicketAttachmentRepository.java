package com.pawanputra.bos.support.internal;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, UUID> {

    List<TicketAttachment> findAllByTicketIdOrderByCreatedAtAsc(UUID ticketId);

    Optional<TicketAttachment> findByIdAndTicketId(UUID id, UUID ticketId);
}
