package com.pawanputra.bos.support.internal;

import com.pawanputra.bos.platform.error.BusinessRuleException;
import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import com.pawanputra.bos.platform.persistence.Specs;
import com.pawanputra.bos.support.api.SlaBreachStatus;
import com.pawanputra.bos.support.api.TicketPriority;
import com.pawanputra.bos.support.api.TicketStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ticket lifecycle: creating, assigning, updating, commenting and resolving support tickets.
 * SLA breach is calculated on the fly from the creation time and the resolution deadline.
 */
@Service
@Transactional(readOnly = true)
public class TicketService {

    /**
     * Who is asking.
     *
     * @param canManage  may assign, resolve, close and configure SLAs
     */
    public record Actor(UUID id, UUID organizationId, String email, String name, boolean canView,
            boolean canManage) {
    }

    /** What the caller supplies when opening or updating a ticket. */
    public record TicketCommand(
            UUID customerId,
            String customerName,
            UUID projectId,
            UUID serviceOfferingId,
            String subject,
            String description,
            TicketPriority priority,
            UUID slaId) {
    }

    /** Optional filters for the list endpoint. */
    public record Filter(String search, TicketStatus status, TicketPriority priority,
            UUID assignedUserId, UUID customerId) {
    }

    // ------------------------------------------------------------------ output records

    public record TicketSummary(
            UUID id, String ticketNumber, String customerName, UUID customerId,
            String subject, TicketPriority priority, TicketStatus status,
            UUID assignedUserId, String assignedUserName,
            Instant createdAt, Instant dueAt, SlaBreachStatus slaBreachStatus) {
    }

    public record CommentRow(UUID id, UUID authorId, String authorName, String body,
            boolean internal, Instant createdAt) {
    }

    public record AttachmentRow(UUID id, String fileName, String mimeType, long fileSize,
            String uploadedByName, Instant createdAt) {
    }

    public record StatusHistoryRow(UUID id, TicketStatus fromStatus, TicketStatus toStatus,
            String changedByName, Instant changedAt, String note) {
    }

    public record TicketDetail(
            TicketSummary ticket,
            String description,
            UUID projectId,
            UUID serviceOfferingId,
            Instant firstResponseAt,
            Instant resolvedAt,
            List<CommentRow> comments,
            List<AttachmentRow> attachments,
            List<StatusHistoryRow> statusHistory,
            long version) {
    }

    // ------------------------------------------------------------------ deps

    private final TicketRepository tickets;
    private final SlaRepository slas;
    private final TicketCommentRepository comments;
    private final TicketAttachmentRepository attachments;
    private final TicketStatusHistoryRepository statusHistory;
    private final Clock clock;

    TicketService(TicketRepository tickets, SlaRepository slas,
            TicketCommentRepository comments, TicketAttachmentRepository attachments,
            TicketStatusHistoryRepository statusHistory, Clock clock) {
        this.tickets = tickets;
        this.slas = slas;
        this.comments = comments;
        this.attachments = attachments;
        this.statusHistory = statusHistory;
        this.clock = clock;
    }

    // ------------------------------------------------------------------ queries

    public Page<TicketSummary> list(Actor actor, Filter filter, Pageable pageable) {
        Specification<Ticket> spec = Specs.<Ticket>equalTo("organizationId", actor.organizationId())
                .and(Specs.equalTo("status", filter.status()))
                .and(Specs.equalTo("priority", filter.priority()))
                .and(Specs.equalTo("assignedUserId", filter.assignedUserId()))
                .and(Specs.equalTo("customerId", filter.customerId()))
                .and(Specs.search(filter.search(), "subject", "customerName", "ticketNumber"));

        return tickets.findAll(spec, pageable).map(t -> toSummary(t, clock.instant()));
    }

    public TicketDetail get(Actor actor, UUID id) {
        Ticket ticket = require(id, actor.organizationId());
        return toDetail(ticket);
    }

    // ------------------------------------------------------------------ mutations

    @Transactional
    public TicketDetail create(Actor actor, TicketCommand cmd) {
        long seq = tickets.nextTicketNumber();
        String number = "TKT-%05d".formatted(seq);

        Ticket ticket = new Ticket(actor.organizationId(), number);
        apply(cmd, ticket, actor.organizationId());
        tickets.save(ticket);
        recordChange(ticket, null, TicketStatus.OPEN, actor.id(), actor.name(), null);
        return toDetail(ticket);
    }

    @Transactional
    public TicketDetail update(Actor actor, UUID id, TicketCommand cmd) {
        Ticket ticket = require(id, actor.organizationId());
        if (ticket.getStatus().isTerminal()) {
            throw new BusinessRuleException("A resolved or closed ticket cannot be edited.");
        }
        apply(cmd, ticket, actor.organizationId());
        return toDetail(tickets.save(ticket));
    }

    @Transactional
    public TicketDetail assign(Actor actor, UUID id, UUID assignedUserId, String assignedUserName,
            String note) {
        Ticket ticket = require(id, actor.organizationId());
        if (ticket.getStatus().isTerminal()) {
            throw new BusinessRuleException("A resolved or closed ticket cannot be re-assigned.");
        }
        TicketStatus before = ticket.getStatus();
        ticket.assignTo(assignedUserId, assignedUserName);
        recordChange(ticket, before, ticket.getStatus(), actor.id(), actor.name(), note);
        return toDetail(tickets.save(ticket));
    }

    @Transactional
    public TicketDetail changeStatus(Actor actor, UUID id, TicketStatus newStatus, String note) {
        Ticket ticket = require(id, actor.organizationId());
        TicketStatus current = ticket.getStatus();

        if (current == newStatus) {
            return toDetail(ticket);
        }
        if (current.isTerminal() && newStatus != TicketStatus.OPEN) {
            throw new BusinessRuleException(
                    "A %s ticket can only be reopened, not moved to %s.".formatted(current, newStatus));
        }

        switch (newStatus) {
            case RESOLVED -> ticket.resolve(clock.instant());
            case CLOSED -> ticket.close();
            case OPEN -> ticket.reopen();
            default -> ticket.setStatus(newStatus);
        }
        recordChange(ticket, current, newStatus, actor.id(), actor.name(), note);
        return toDetail(tickets.save(ticket));
    }

    @Transactional
    public CommentRow addComment(Actor actor, UUID ticketId, String body, boolean internal) {
        Ticket ticket = require(ticketId, actor.organizationId());
        if (ticket.getStatus().isTerminal() && !actor.canManage()) {
            throw new BusinessRuleException("Comments cannot be added to a closed ticket.");
        }
        // Record first response time when an agent first comments on a customer ticket
        ticket.recordFirstResponse(clock.instant());
        tickets.save(ticket);

        TicketComment comment = new TicketComment(ticketId, actor.id(), actor.name(), body, internal);
        comments.save(comment);
        return toCommentRow(comment);
    }

    // ------------------------------------------------------------------ helpers

    private void apply(TicketCommand cmd, Ticket ticket, UUID organizationId) {
        ticket.setCustomerId(cmd.customerId());
        ticket.setCustomerName(cmd.customerName() != null ? cmd.customerName() : "");
        ticket.setProjectId(cmd.projectId());
        ticket.setServiceOfferingId(cmd.serviceOfferingId());
        ticket.setSubject(cmd.subject());
        ticket.setDescription(cmd.description());
        ticket.setPriority(cmd.priority() != null ? cmd.priority() : TicketPriority.MEDIUM);

        if (cmd.slaId() != null) {
            Sla sla = slas.findByIdAndOrganizationId(cmd.slaId(), organizationId)
                    .orElseThrow(() -> new ResourceNotFoundException("SLA", cmd.slaId()));
            ticket.setSlaId(sla.getId());
            Instant base = ticket.getCreatedAt() != null ? ticket.getCreatedAt() : clock.instant();
            ticket.setDueAt(base.plus(sla.getResolutionTimeHours(), ChronoUnit.HOURS));
        } else {
            ticket.setSlaId(null);
            ticket.setDueAt(null);
        }
    }

    private void recordChange(Ticket ticket, TicketStatus from, TicketStatus to,
            UUID changedById, String changedByName, String note) {
        statusHistory.save(new TicketStatusHistory(
                ticket.getId(), from, to, changedById, changedByName, clock.instant(), note));
    }

    private Ticket require(UUID id, UUID organizationId) {
        return tickets.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", id));
    }

    private TicketSummary toSummary(Ticket t, Instant now) {
        return new TicketSummary(
                t.getId(), t.getTicketNumber(), t.getCustomerName(), t.getCustomerId(),
                t.getSubject(), t.getPriority(), t.getStatus(),
                t.getAssignedUserId(), t.getAssignedUserName(),
                t.getCreatedAt(), t.getDueAt(), breachStatus(t, now));
    }

    private TicketDetail toDetail(Ticket t) {
        Instant now = clock.instant();
        List<CommentRow> commentRows = comments.findAllByTicketIdOrderByCreatedAtAsc(t.getId())
                .stream().map(this::toCommentRow).toList();
        List<AttachmentRow> attachmentRows = attachments.findAllByTicketIdOrderByCreatedAtAsc(t.getId())
                .stream().map(this::toAttachmentRow).toList();
        List<StatusHistoryRow> historyRows = statusHistory.findAllByTicketIdOrderByChangedAtAsc(t.getId())
                .stream().map(this::toHistoryRow).toList();

        return new TicketDetail(
                toSummary(t, now),
                t.getDescription(),
                t.getProjectId(),
                t.getServiceOfferingId(),
                t.getFirstResponseAt(),
                t.getResolvedAt(),
                commentRows,
                attachmentRows,
                historyRows,
                t.getVersion());
    }

    private CommentRow toCommentRow(TicketComment c) {
        return new CommentRow(c.getId(), c.getAuthorId(), c.getAuthorName(), c.getBody(),
                c.isInternal(), c.getCreatedAt());
    }

    private AttachmentRow toAttachmentRow(TicketAttachment a) {
        return new AttachmentRow(a.getId(), a.getFileName(), a.getMimeType(), a.getFileSize(),
                a.getUploadedByName(), a.getCreatedAt());
    }

    private StatusHistoryRow toHistoryRow(TicketStatusHistory h) {
        return new StatusHistoryRow(h.getId(), h.getFromStatus(), h.getToStatus(),
                h.getChangedByName(), h.getChangedAt(), h.getNote());
    }

    static SlaBreachStatus breachStatus(Ticket ticket, Instant now) {
        if (ticket.getDueAt() == null) {
            return SlaBreachStatus.NOT_APPLICABLE;
        }
        if (ticket.getStatus().isTerminal()) {
            // Resolved before the deadline = no breach, even though due is in the past now
            if (ticket.getResolvedAt() != null && ticket.getResolvedAt().isBefore(ticket.getDueAt())) {
                return SlaBreachStatus.ON_TRACK;
            }
            return SlaBreachStatus.BREACHED;
        }
        if (now.isAfter(ticket.getDueAt())) {
            return SlaBreachStatus.BREACHED;
        }
        // At-risk when less than 20 % of the window remains
        long totalSeconds = ticket.getCreatedAt().until(ticket.getDueAt(), ChronoUnit.SECONDS);
        if (totalSeconds > 0) {
            long elapsedSeconds = ticket.getCreatedAt().until(now, ChronoUnit.SECONDS);
            if (elapsedSeconds * 100 / totalSeconds >= 80) {
                return SlaBreachStatus.AT_RISK;
            }
        }
        return SlaBreachStatus.ON_TRACK;
    }
}
