package com.pawanputra.bos.support.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketStatusHistoryRepository extends JpaRepository<TicketStatusHistory, UUID> {

    List<TicketStatusHistory> findAllByTicketIdOrderByChangedAtAsc(UUID ticketId);
}
