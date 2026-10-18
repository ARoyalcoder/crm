package com.pawanputra.bos.workflow.web;

import com.pawanputra.bos.identity.api.Permissions;
import com.pawanputra.bos.platform.config.OpenApiConfig;
import com.pawanputra.bos.platform.security.CurrentUser;
import com.pawanputra.bos.platform.web.ApiPaths;
import com.pawanputra.bos.platform.web.PageResponse;
import com.pawanputra.bos.platform.web.Paging;
import com.pawanputra.bos.workflow.api.WorkflowStatus;
import com.pawanputra.bos.workflow.internal.WorkflowEngineService;
import com.pawanputra.bos.workflow.internal.WorkflowRule;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.V1 + "/workflow-rules")
@Tag(name = "Workflow Automation")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
public class WorkflowController {

    private static final String CAN_VIEW = "hasAuthority('" + Permissions.WORKFLOW_VIEW + "')";
    private static final String CAN_MANAGE = "hasAuthority('" + Permissions.WORKFLOW_MANAGE + "')";

    private final WorkflowEngineService engine;

    public WorkflowController(WorkflowEngineService engine) {
        this.engine = engine;
    }

    @GetMapping
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "List workflow rules, optionally filtered by status")
    public List<WorkflowViews.WorkflowRuleView> list(
            @RequestParam(required = false) WorkflowStatus status) {
        CurrentUser user = CurrentUser.require();
        return engine.listRules(user.organizationId(), status)
                .stream()
                .map(WorkflowViews.WorkflowRuleView::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Create a new workflow rule")
    public ResponseEntity<WorkflowViews.WorkflowRuleView> create(
            @Valid @RequestBody WorkflowDtos.SaveRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        WorkflowRule created = engine.createRule(
                user.organizationId(),
                request.name(),
                request.description(),
                request.status() != null ? request.status() : WorkflowStatus.DRAFT,
                request.triggerEventType(),
                request.conditions(),
                request.actions(),
                user.email());
        return ResponseEntity
                .created(URI.create(ApiPaths.V1 + "/workflow-rules/" + created.getId()))
                .body(WorkflowViews.WorkflowRuleView.from(created));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Get a workflow rule by ID")
    public WorkflowViews.WorkflowRuleView getById(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return WorkflowViews.WorkflowRuleView.from(engine.getRule(user.organizationId(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Update a workflow rule (conditions, actions, trigger)")
    public WorkflowViews.WorkflowRuleView update(
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowDtos.SaveRuleRequest request) {
        CurrentUser user = CurrentUser.require();
        return WorkflowViews.WorkflowRuleView.from(engine.updateRule(
                user.organizationId(),
                id,
                request.name(),
                request.description(),
                request.triggerEventType(),
                request.conditions(),
                request.actions(),
                user.email()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Delete a workflow rule")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        engine.deleteRule(user.organizationId(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/enable")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Enable (set ACTIVE) a workflow rule")
    public WorkflowViews.WorkflowRuleView enable(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return WorkflowViews.WorkflowRuleView.from(
                engine.enableRule(user.organizationId(), id, user.email()));
    }

    @PutMapping("/{id}/disable")
    @PreAuthorize(CAN_MANAGE)
    @Operation(summary = "Disable (set INACTIVE) a workflow rule")
    public WorkflowViews.WorkflowRuleView disable(@PathVariable UUID id) {
        CurrentUser user = CurrentUser.require();
        return WorkflowViews.WorkflowRuleView.from(
                engine.disableRule(user.organizationId(), id, user.email()));
    }

    @GetMapping("/{id}/execution-log")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "Paginated execution history for a specific rule")
    public PageResponse<WorkflowViews.WorkflowExecutionLogView> getRuleLog(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return PageResponse.from(
                engine.getRuleExecutionLog(
                        id,
                        Paging.of(page, size, null,
                                Map.of("executedAt", "executedAt"),
                                Sort.by(Sort.Order.desc("executedAt")))),
                WorkflowViews.WorkflowExecutionLogView::from);
    }

    @GetMapping("/execution-log")
    @PreAuthorize(CAN_VIEW)
    @Operation(summary = "All recent execution logs across all rules for the organisation")
    public PageResponse<WorkflowViews.WorkflowExecutionLogView> getOrgLog(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        CurrentUser user = CurrentUser.require();
        return PageResponse.from(
                engine.getOrgExecutionLog(
                        user.organizationId(),
                        Paging.of(page, size, null,
                                Map.of("executedAt", "executedAt"),
                                Sort.by(Sort.Order.desc("executedAt")))),
                WorkflowViews.WorkflowExecutionLogView::from);
    }
}
