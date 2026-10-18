-- Integration Center: external integration configuration registry.
--
-- Each integration type has at most one configuration row per organisation.
-- configJson is an opaque encrypted blob and is never exposed through the API.
--
-- Tables:
--   integration_configs

CREATE TABLE integration_configs (
    id              uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid          NOT NULL,
    type            varchar(30)   NOT NULL,
    provider_name   varchar(100),
    status          varchar(20)   NOT NULL DEFAULT 'NOT_CONFIGURED',
    config_json     text,
    last_tested_at  timestamptz,
    last_error      text,
    enabled         boolean       NOT NULL DEFAULT false,
    created_by      varchar(100)  NOT NULL,
    updated_by      varchar(100)  NOT NULL,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_integration_configs PRIMARY KEY (id),
    CONSTRAINT uq_integration_org_type UNIQUE (organization_id, type),
    CONSTRAINT ck_integration_type CHECK (type IN (
        'EMAIL', 'WHATSAPP', 'GOOGLE_DRIVE', 'CALENDAR',
        'PAYMENT_GATEWAY', 'MAPS', 'OBJECT_STORAGE', 'WEBHOOK'
    )),
    CONSTRAINT ck_integration_status CHECK (status IN (
        'CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING', 'NOT_CONFIGURED'
    ))
);

CREATE INDEX ix_integration_configs_org_type
    ON integration_configs (organization_id, type);

CREATE INDEX ix_integration_configs_org_status
    ON integration_configs (organization_id, status);

-- ---------------------------------------------------------------------------
-- Seed default NOT_CONFIGURED rows for all existing organisations

INSERT INTO integration_configs (organization_id, type, status, enabled, created_by, updated_by)
SELECT o.id, t.type, 'NOT_CONFIGURED', false, 'system', 'system'
FROM organizations o
CROSS JOIN (VALUES
    ('EMAIL'),
    ('WHATSAPP'),
    ('GOOGLE_DRIVE'),
    ('CALENDAR'),
    ('PAYMENT_GATEWAY'),
    ('MAPS'),
    ('OBJECT_STORAGE'),
    ('WEBHOOK')
) AS t (type);

-- ---------------------------------------------------------------------------
-- Permissions

INSERT INTO permissions (code, name) VALUES
    ('INTEGRATION_VIEW',   'View external integration configurations and their status'),
    ('INTEGRATION_MANAGE', 'Configure, enable, disable and test external integrations');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'INTEGRATION_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN'))
   OR (p.code = 'INTEGRATION_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN'));
