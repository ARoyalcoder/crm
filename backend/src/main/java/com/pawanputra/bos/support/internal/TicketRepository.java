package com.pawanputra.bos.support.internal;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface TicketRepository extends JpaRepository<Ticket, UUID>, JpaSpecificationExecutor<Ticket> {

    /** Always scope by organization: a ticket of another organization must look like it does not exist. */
    Optional<Ticket> findByIdAndOrganizationId(UUID id, UUID organizationId);

    @Query(value = "SELECT nextval('ticket_number_seq')", nativeQuery = true)
    long nextTicketNumber();
}
