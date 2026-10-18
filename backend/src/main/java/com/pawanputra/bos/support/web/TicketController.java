package com.pawanputra.bos.support.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import com.pawanputra.bos.platform.web.Paging;
import com.pawanputra.bos.support.api.TicketPriority;
import com.pawanputra.bos.support.api.TicketStatus;
import com.pawanputra.bos.support.internal.TicketService;
import com.pawanputra.bos.support.internal.TicketService.Actor;
import com.pawanputra.bos.support.internal.TicketService.Filter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Support tickets: create, view, update, assign, change status and add comments.
 */
@RestController
@RequestMapping(ApiPaths.V1 + "/tickets")
@Tag(name = "Support – Tickets")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class TicketController {

    private static final String CAN_VIEW   = "hasAnyAuthority('" + Permissions.TICKET_VIEW + "', '"
            + Permissions.TICKET_MANAGE + "', '" + Permissions.TICKET_CREATE + "')";
    private static final String CAN_CREATE = "hasAnyAuthority('" + Permissions.TICKET_CREATE + "', '"
            + Permissions.TICKET_MANAGE + "')";
    private static final String CAN_ASSIGN = "hasAnyAuthority('" + Permissions.TICKET_ASSIGN + "', '"
            + Permissions.TICKET_MANAGE + "')";
    private static final String CAN_RESOLVE = "hasAnyAuthority('" + Permissions.TICKET_RESOLVE + "', '"
            + Permissions.TICKET_MANAGE + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.TICKET_MANAGE + "')";

    private static final Map<String, String> SORTS = Map.of(
            "createdAt", "createdAt", "subject", "subject",
            "priority", "priority", "status", "status", "dueAt", "dueAt");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"));

    // ------------------------------------------------------------------ request / response records

    record TicketRequest(
            UUID customerId,
            @NotBlank @Size(max = 200) String customerName,
            UUID projectId,
            UUID serviceOfferingId,
            @NotBlank @Size(max = 500) String subject,
            @Size(max = 10000) String description,
            TicketPriority priority,
            UUID slaId) {

        TicketService.TicketCommand toCommand() {
            return new TicketService.TicketCommand(customerId, customerName.trim(), projectId,
                    serviceOfferingId, subject.trim(), trimToNull(description), priority, slaId);
        }
    }

    record AssignRequest(
            @NotNull UUID assignedUserId,
            @NotBlank @Size(max = 200) String assignedUserName,
            @Size(max = 500) String note) {
    }

    record StatusRequest(
            @NotNull TicketStatus status,
            @Size(max = 500) String note) {
    }

    record CommentRequest(
            @NotBlank @Size(max = 10000) String body,
            boolean internal) {
    }

    // ------------------------------------------------------------------ endpoints

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List tickets with optional filters: status, priority, assignedUserId, customerId, search. "
            + "Sort: createdAt (default), subject, priority, status, dueAt. "
            + "Requires TICKET_VIEW, TICKET_CREATE or TICKET_MANAGE.")
    public PageResponse<TicketService.TicketSummary> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) UUID assignedUserId,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return PageResponse.from(
                service.list(actor(), new Filter(search, status, priority, assignedUserId, customerId),
                        Paging.of(page, size, sort, SORTS, DEFAULT_SORT)),
                Function.identity());
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "One ticket with its comments, attachments, and status history. "
            + "Requires TICKET_VIEW, TICKET_CREATE or TICKET_MANAGE.")
    public TicketService.TicketDetail get(@PathVariable UUID id) {
        return service.get(actor(), id);
    }

    @PostMapping
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Open a new support ticket. Requires TICKET_CREATE or TICKET_MANAGE.")
    public ResponseEntity<TicketService.TicketDetail> create(@Valid @RequestBody TicketRequest request) {
        TicketService.TicketDetail created = service.create(actor(), request.toCommand());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/tickets/" + created.ticket().id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a ticket's details (subject, description, priority, SLA). "
            + "Requires TICKET_MANAGE.")
    public TicketService.TicketDetail update(@PathVariable UUID id,
            @Valid @RequestBody TicketRequest request) {
        return service.update(actor(), id, request.toCommand());
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize(CAN_ASSIGN)
    @Operation(summary = "Assign or re-assign the ticket to an agent. Requires TICKET_ASSIGN or TICKET_MANAGE.")
    public TicketService.TicketDetail assign(@PathVariable UUID id,
            @Valid @RequestBody AssignRequest request) {
        return service.assign(actor(), id, request.assignedUserId(), request.assignedUserName(),
                trimToNull(request.note()));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize(CAN_RESOLVE)
    @Operation(summary = "Mark the ticket as resolved. Requires TICKET_RESOLVE or TICKET_MANAGE.")
    public TicketService.TicketDetail resolve(@PathVariable UUID id,
            @Valid @RequestBody StatusRequest request) {
        return service.changeStatus(actor(), id, TicketStatus.RESOLVED, trimToNull(request.note()));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize(CAN_RESOLVE)
    @Operation(summary = "Close the ticket permanently. Requires TICKET_RESOLVE or TICKET_MANAGE.")
    public TicketService.TicketDetail close(@PathVariable UUID id,
            @Valid @RequestBody StatusRequest request) {
        return service.changeStatus(actor(), id, TicketStatus.CLOSED, trimToNull(request.note()));
    }

    @PostMapping("/{id}/status")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Move the ticket to any valid status, including re-opening. Requires TICKET_MANAGE.")
    public TicketService.TicketDetail changeStatus(@PathVariable UUID id,
            @Valid @RequestBody StatusRequest request) {
        return service.changeStatus(actor(), id, request.status(), trimToNull(request.note()));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "All comments on the ticket. Requires TICKET_VIEW, TICKET_CREATE or TICKET_MANAGE.")
    public TicketService.TicketDetail getComments(@PathVariable UUID id) {
        return service.get(actor(), id);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize(CAN_CREATE)
    @Operation(summary = "Add a comment. Pass internal=true for an agent-only note. "
            + "Requires TICKET_CREATE or TICKET_MANAGE.")
    public TicketService.CommentRow addComment(@PathVariable UUID id,
            @Valid @RequestBody CommentRequest request) {
        return service.addComment(actor(), id, request.body().trim(), request.internal());
    }

    // ------------------------------------------------------------------ helpers

    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    private static Actor actor() {
        CurrentUser user = CurrentUser.require();
        String displayName = user.email(); // fall back to email as display name
        return new Actor(user.id(), user.organizationId(), user.email(), displayName,
                user.hasPermission(Permissions.TICKET_VIEW) || user.hasPermission(Permissions.TICKET_CREATE),
                user.hasPermission(Permissions.TICKET_MANAGE));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
