-- Notification Center: in-app notifications delivered to specific users,
-- plus per-user preferences controlling which events trigger a notification.
--
-- Tables:
--   notifications
--   notification_preferences

CREATE TABLE notifications (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    recipient_user_id   uuid          NOT NULL,
    type                varchar(20)   NOT NULL,
    title               varchar(255)  NOT NULL,
    message             text          NOT NULL,
    entity_type         varchar(100),
    entity_id           uuid,
    read                boolean       NOT NULL DEFAULT false,
    read_at             timestamptz,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_notifications PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES users (id),
    CONSTRAINT ck_notification_type CHECK (type IN (
        'INFO', 'SUCCESS', 'WARNING', 'CRITICAL', 'ACHIEVEMENT', 'OPPORTUNITY', 'RISK'
    ))
);

-- Most-common query: unread notifications for a user, newest first.
CREATE INDEX ix_notifications_recipient_unread ON notifications (recipient_user_id, read, created_at DESC);

-- Organisation-scoped queries.
CREATE INDEX ix_notifications_org_created ON notifications (organization_id, created_at DESC);

CREATE TABLE notification_preferences (
    id               uuid          NOT NULL DEFAULT gen_random_uuid(),
    user_id          uuid          NOT NULL,
    event_type       varchar(50)   NOT NULL,
    in_app_enabled   boolean       NOT NULL DEFAULT true,
    email_enabled    boolean       NOT NULL DEFAULT false,
    organization_id  uuid          NOT NULL,
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_notification_preferences PRIMARY KEY (id),
    CONSTRAINT fk_notification_prefs_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_notification_pref_user_event UNIQUE (user_id, event_type)
);

CREATE INDEX ix_notification_prefs_user ON notification_preferences (user_id);

-- Permissions
INSERT INTO permissions (code, name) VALUES
    ('NOTIFICATION_VIEW', 'View and manage own in-app notifications');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE p.code = 'NOTIFICATION_VIEW'
  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HR', 'PROJECT_MANAGER',
                 'SALES_MANAGER', 'TECHNICIAN', 'SUPPORT_AGENT');
