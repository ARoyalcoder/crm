package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * A comment on a support ticket. Internal comments (notes) are only visible to agents,
 * not to the customer.
 */
@Entity
@Table(name = "ticket_comments")
public class TicketComment extends BaseEntity {

    @Column(name = "ticket_id", nullable = false, updatable = false)
    private UUID ticketId;

    @Column(name = "author_id", nullable = false, updatable = false)
    private UUID authorId;

    @Column(name = "author_name", nullable = false, updatable = false, length = 200)
    private String authorName;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;

    /** When true, only agents can see this comment; it is not shown to the customer. */
    @Column(name = "internal", nullable = false)
    private boolean internal = false;

    protected TicketComment() {
        // for JPA
    }

    public TicketComment(UUID ticketId, UUID authorId, String authorName, String body, boolean internal) {
        this.ticketId = ticketId;
        this.authorId = authorId;
        this.authorName = authorName;
        this.body = body;
        this.internal = internal;
    }

    public UUID getTicketId() {
        return ticketId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public boolean isInternal() {
        return internal;
    }
}
