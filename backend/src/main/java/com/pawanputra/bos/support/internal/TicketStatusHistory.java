package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import com.pawanputra.bos.support.api.TicketStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One status change on a ticket: who moved it from where to where, and when. */
@Entity
@Table(name = "ticket_status_history")
public class TicketStatusHistory extends BaseEntity {

    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private TicketStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 30)
    private TicketStatus toStatus;

    @Column(name = "changed_by_id", nullable = false, updatable = false)
    private UUID changedById;

    @Column(name = "changed_by_name", nullable = false, updatable = false, length = 200)
    private String changedByName;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @Column(name = "note", columnDefinition = "text")
    private String note;

    protected TicketStatusHistory() {
        // for JPA
    }

    public TicketStatusHistory(UUID ticketId, TicketStatus fromStatus, TicketStatus toStatus,
            UUID changedById, String changedByName, Instant changedAt, String note) {
        this.ticketId = ticketId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedById = changedById;
        this.changedByName = changedByName;
        this.changedAt = changedAt;
        this.note = note;
    }

    public UUID getTicketId() {
        return ticketId;
    }

    public TicketStatus getFromStatus() {
        return fromStatus;
    }

    public TicketStatus getToStatus() {
        return toStatus;
    }

    public UUID getChangedById() {
        return changedById;
    }

    public String getChangedByName() {
        return changedByName;
    }

    public Instant getChangedAt() {
        return changedAt;
    }

    public String getNote() {
        return note;
    }
}
