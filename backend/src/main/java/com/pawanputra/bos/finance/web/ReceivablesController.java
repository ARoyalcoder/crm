package com.pawanputra.bos.finance.web;

import com.pawanputra.bos.finance.internal.Ageing;
import com.pawanputra.bos.finance.internal.CollectionTask;
import com.pawanputra.bos.finance.internal.ReceivablesService;
import com.pawanputra.bos.finance.internal.ReceivablesService.Config;
import com.pawanputra.bos.finance.internal.ReceivablesService.Dashboard;
import com.pawanputra.bos.finance.internal.ReceivablesService.InvoiceRow;
import com.pawanputra.bos.finance.internal.ReceivablesService.TaskRow;
import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Receivables management: dashboard, outstanding / overdue invoices, collection tasks, config. */
@RestController
@RequestMapping(ApiPaths.V1 + "/receivables")
@Tag(name = "Receivables")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class ReceivablesController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.RECEIVABLES_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.RECEIVABLES_MANAGE + "')";

    private final ReceivablesService receivablesService;

    public ReceivablesController(ReceivablesService receivablesService) {
        this.receivablesService = receivablesService;
    }

    // ------------------------------------------------------------------ dashboard

    @GetMapping("/dashboard")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "KPI summary: total receivable, overdue, due today, due this week, "
            + "collection rate and ageing buckets. Requires RECEIVABLES_VIEW.")
    public Dashboard dashboard() {
        return receivablesService.getDashboard(CurrentUser.require().organizationId());
    }

    // ------------------------------------------------------------------ invoice lists

    @GetMapping("/outstanding")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "All ISSUED and PARTIALLY_PAID invoices, sorted by due date. Requires RECEIVABLES_VIEW.")
    public PageResponse<InvoiceRow> outstanding(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return receivablesService.getOutstandingInvoices(
                CurrentUser.require().organizationId(), page, size);
    }

    @GetMapping("/overdue")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Only invoices past their due date. Requires RECEIVABLES_VIEW.")
    public PageResponse<InvoiceRow> overdue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return receivablesService.getOverdueInvoices(
                CurrentUser.require().organizationId(), page, size);
    }

    @GetMapping("/ageing")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Full ageing breakdown by customer and bucket. Requires RECEIVABLES_VIEW.")
    public Ageing.Report ageing() {
        return receivablesService.getAgeingReport(CurrentUser.require().organizationId());
    }

    // ------------------------------------------------------------------ collection tasks

    @GetMapping("/collection-tasks")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List collection tasks, optionally filtered by status. Requires RECEIVABLES_VIEW.")
    public PageResponse<TaskRow> listCollectionTasks(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        CollectionTask.Status statusFilter = status != null ? CollectionTask.Status.valueOf(status) : null;
        return receivablesService.getCollectionTasks(
                CurrentUser.require().organizationId(), statusFilter, page, size);
    }

    @PostMapping("/collection-tasks")
    @PreAuthorize(CAN_MANAGE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a collection task for an invoice. Requires RECEIVABLES_MANAGE.")
    public TaskRow createCollectionTask(@RequestBody CreateTaskRequest body) {
        ReceivablesService.CreateTaskInput input = new ReceivablesService.CreateTaskInput(
                body.invoiceId(),
                body.priority() != null ? CollectionTask.Priority.valueOf(body.priority()) : CollectionTask.Priority.MEDIUM,
                body.assignedToUserId(),
                body.dueDate(),
                body.notes());
        return receivablesService.createCollectionTask(input, CurrentUser.require().organizationId());
    }

    @GetMapping("/collection-tasks/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a single collection task. Requires RECEIVABLES_VIEW.")
    public TaskRow getCollectionTask(@PathVariable UUID id) {
        return receivablesService.getCollectionTask(id, CurrentUser.require().organizationId());
    }

    @PutMapping("/collection-tasks/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a collection task. Requires RECEIVABLES_MANAGE.")
    public TaskRow updateCollectionTask(@PathVariable UUID id, @RequestBody UpdateTaskRequest body) {
        ReceivablesService.UpdateTaskInput input = new ReceivablesService.UpdateTaskInput(
                body.priority() != null ? CollectionTask.Priority.valueOf(body.priority()) : null,
                body.status() != null ? CollectionTask.Status.valueOf(body.status()) : null,
                body.assignedToUserId(),
                body.dueDate(),
                body.notes());
        return receivablesService.updateCollectionTask(id, input, CurrentUser.require().organizationId());
    }

    // ------------------------------------------------------------------ config

    @GetMapping("/config")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get receivables configuration (or defaults if none saved). Requires RECEIVABLES_VIEW.")
    public Config getConfig() {
        return receivablesService.getConfig(CurrentUser.require().organizationId());
    }

    @PutMapping("/config")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Save receivables configuration. Requires RECEIVABLES_MANAGE.")
    public Config updateConfig(@RequestBody UpdateConfigRequest body) {
        ReceivablesService.UpdateConfigInput input = new ReceivablesService.UpdateConfigInput(
                body.overdueDays1(), body.overdueDays2(),
                body.collectionTaskEnabled(), body.escalationEnabled(),
                body.escalationUserId());
        return receivablesService.updateConfig(CurrentUser.require().organizationId(), input);
    }

    // ------------------------------------------------------------------ request bodies

    record CreateTaskRequest(
            UUID invoiceId,
            String priority,
            UUID assignedToUserId,
            LocalDate dueDate,
            String notes) {
    }

    record UpdateTaskRequest(
            String priority,
            String status,
            UUID assignedToUserId,
            LocalDate dueDate,
            String notes) {
    }

    record UpdateConfigRequest(
            int overdueDays1,
            int overdueDays2,
            boolean collectionTaskEnabled,
            boolean escalationEnabled,
            UUID escalationUserId) {
    }
}
