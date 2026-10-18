package com.pawanputra.bos.activity.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Public port for creating activity tasks from other modules.
 */
public interface ActivityTaskPort {

    void createTask(
            UUID orgId,
            String title,
            TargetEntityType entityType,
            UUID entityId,
            UUID ownerId,
            String ownerName,
            TaskPriority priority,
            Instant dueDate);
}
