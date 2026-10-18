package com.pawanputra.bos.workflow.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pawanputra.bos.activity.api.ActivityTaskPort;
import com.pawanputra.bos.activity.api.TargetEntityType;
import com.pawanputra.bos.activity.api.TaskPriority;
import com.pawanputra.bos.events.api.BusinessEventOccurred;
import com.pawanputra.bos.finance.api.CollectionTaskPort;
import com.pawanputra.bos.notification.api.NotificationPort;
import com.pawanputra.bos.notification.api.NotificationType;
import com.pawanputra.bos.workflow.api.ActionType;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Executes a single workflow action defined in a rule's actions JSON array.
 *
 * <p><strong>Safety contract:</strong> only {@link ActionType} enum values are dispatched to.
 * No arbitrary code paths, no script evaluation, no reflection.
 *
 * <p>Cross-module operations are performed exclusively via public ports ({@code api} packages).
 */
@Component
class WorkflowActionExecutor {

    private static final Logger log = LoggerFactory.getLogger(WorkflowActionExecutor.class);

    private final ObjectMapper objectMapper;
    private final CollectionTaskPort collectionTaskPort;
    private final NotificationPort notificationPort;
    private final ActivityTaskPort activityTaskPort;

    WorkflowActionExecutor(
            ObjectMapper objectMapper,
            CollectionTaskPort collectionTaskPort,
            NotificationPort notificationPort,
            ActivityTaskPort activityTaskPort) {
        this.objectMapper = objectMapper;
        this.collectionTaskPort = collectionTaskPort;
        this.notificationPort = notificationPort;
        this.activityTaskPort = activityTaskPort;
    }

    /**
     * Executes the action described by the JSON object.
     *
     * @param actionJson  an object like {@code {"actionType":"SEND_NOTIFICATION","params":{…}}}
     * @param event       the triggering business event
     * @param orgId       the organisation in scope
     * @return a result record describing success or failure
     */
    @Transactional
    ActionResult execute(Map<String, Object> actionJson, BusinessEventOccurred event, UUID orgId) {
        String actionTypeStr = (String) actionJson.get("actionType");
        @SuppressWarnings("unchecked")
        Map<String, Object> params = actionJson.get("params") instanceof Map<?, ?>
                ? (Map<String, Object>) actionJson.get("params")
                : Map.of();

        ActionType actionType;
        try {
            actionType = ActionType.valueOf(actionTypeStr);
        } catch (Exception e) {
            log.warn("Unknown action type: {}", actionTypeStr);
            return new ActionResult(actionTypeStr, false, "Unknown action type: " + actionTypeStr);
        }

        try {
            return switch (actionType) {
                case CREATE_COLLECTION_TASK -> executeCreateCollectionTask(params, event, orgId);
                case SEND_NOTIFICATION -> executeSendNotification(params, event, orgId);
                case CREATE_ACTIVITY_TASK -> executeCreateActivityTask(params, event, orgId);
                case LOG_ONLY -> {
                    log.info("[WORKFLOW] LOG_ONLY action for event {} on entity {}",
                            event.eventType(), event.entityId());
                    yield new ActionResult(actionTypeStr, true, "Logged");
                }
            };
        } catch (Exception e) {
            log.error("[WORKFLOW] Action {} failed for event {} on entity {}",
                    actionTypeStr, event.eventType(), event.entityId(), e);
            return new ActionResult(actionTypeStr, false, e.getMessage());
        }
    }

    // ---- Action handlers ----

    private ActionResult executeCreateCollectionTask(
            Map<String, Object> params, BusinessEventOccurred event, UUID orgId) {

        UUID entityId = event.entityId();
        if (entityId == null) {
            return new ActionResult("CREATE_COLLECTION_TASK", false, "No entityId on event");
        }

        String priorityStr = (String) params.get("priority");
        boolean created = collectionTaskPort.createCollectionTask(orgId, entityId, priorityStr);
        if (!created) {
            return new ActionResult("CREATE_COLLECTION_TASK", false, "Invoice not found: " + entityId);
        }

        log.info("[WORKFLOW] Created collection task for invoice {}", entityId);
        return new ActionResult("CREATE_COLLECTION_TASK", true, "Created collection task");
    }

    private ActionResult executeSendNotification(
            Map<String, Object> params, BusinessEventOccurred event, UUID orgId) {

        String title = params.getOrDefault("title", event.eventType().name()).toString();
        String message = params.getOrDefault("message",
                "Automated notification for " + event.eventType().name()).toString();

        NotificationType notificationType = NotificationType.INFO;
        String typeStr = (String) params.get("type");
        if (typeStr != null) {
            try {
                notificationType = NotificationType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Unknown notification type: {}, using INFO", typeStr);
            }
        }

        // Determine recipient: explicit param → event actor → skip
        UUID recipientId = null;
        String recipientIdStr = (String) params.get("recipientUserId");
        if (recipientIdStr != null && !recipientIdStr.isBlank()) {
            try {
                recipientId = UUID.fromString(recipientIdStr);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid recipientUserId in notification params: {}", recipientIdStr);
            }
        }
        if (recipientId == null && event.actorId() != null) {
            recipientId = event.actorId();
        }
        if (recipientId == null) {
            return new ActionResult("SEND_NOTIFICATION", false,
                    "No recipient found — event has no actorId and params have no recipientUserId");
        }

        notificationPort.notify(recipientId, notificationType, title, message,
                event.entityType(), event.entityId(), orgId);

        log.info("[WORKFLOW] Sent notification '{}' to user {}", title, recipientId);
        return new ActionResult("SEND_NOTIFICATION", true, "Notification sent to " + recipientId);
    }

    private ActionResult executeCreateActivityTask(
            Map<String, Object> params, BusinessEventOccurred event, UUID orgId) {

        String title = params.getOrDefault("title",
                "Automated task: " + event.eventType().name()).toString();

        TaskPriority priority = TaskPriority.MEDIUM;
        String priorityStr = (String) params.get("priority");
        if (priorityStr != null) {
            try {
                priority = TaskPriority.valueOf(priorityStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Unknown task priority: {}, using MEDIUM", priorityStr);
            }
        }

        // Try to map entity type string to TargetEntityType
        TargetEntityType entityType = TargetEntityType.CUSTOMER;
        if (event.entityType() != null) {
            try {
                entityType = TargetEntityType.valueOf(event.entityType().toUpperCase());
            } catch (IllegalArgumentException e) {
                // entityType not in the TargetEntityType enum — fall back to CUSTOMER
                log.debug("Entity type {} not mappable to TargetEntityType, using CUSTOMER",
                        event.entityType());
            }
        }

        UUID ownerId = event.actorId() != null ? event.actorId() : orgId;
        String ownerName = "System";

        activityTaskPort.createTask(orgId, title, entityType, event.entityId(), ownerId, ownerName, priority, null);

        log.info("[WORKFLOW] Created activity task '{}' for entity {}", title, event.entityId());
        return new ActionResult("CREATE_ACTIVITY_TASK", true, "Activity task created");
    }

    // ---- Result type ----

    record ActionResult(String actionType, boolean success, String message) {}
}
