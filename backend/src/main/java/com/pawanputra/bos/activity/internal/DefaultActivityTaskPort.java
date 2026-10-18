package com.pawanputra.bos.activity.internal;

import com.pawanputra.bos.activity.api.ActivityTaskPort;
import com.pawanputra.bos.activity.api.ActivityType;
import com.pawanputra.bos.activity.api.TargetEntityType;
import com.pawanputra.bos.activity.api.TaskPriority;
import com.pawanputra.bos.activity.api.TaskStatus;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default implementation of {@link ActivityTaskPort}.
 */
@Service
public class DefaultActivityTaskPort implements ActivityTaskPort {

    private final ActivityRepository activityRepository;

    public DefaultActivityTaskPort(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @Override
    @Transactional
    public void createTask(
            UUID orgId,
            String title,
            TargetEntityType entityType,
            UUID entityId,
            UUID ownerId,
            String ownerName,
            TaskPriority priority,
            Instant dueDate) {
        Activity activity = new Activity(
                orgId,
                ActivityType.TASK,
                title,
                null,
                entityType,
                entityId,
                null,
                ownerId,
                ownerName,
                priority,
                TaskStatus.PENDING,
                null,
                Instant.now(),
                null,
                null,
                false,
                null,
                null,
                dueDate,
                null);
        activityRepository.save(activity);
    }
}
