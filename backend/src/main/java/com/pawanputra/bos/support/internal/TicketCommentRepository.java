package com.pawanputra.bos.support.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCommentRepository extends JpaRepository<TicketComment, UUID> {

    List<TicketComment> findAllByTicketIdOrderByCreatedAtAsc(UUID ticketId);
}
