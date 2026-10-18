-- Workflow Automation Engine
--
-- Supports:
--   - Workflow rules: EVENT_BASED rules with JSON conditions and actions
--   - Execution logs: append-only audit trail of every rule evaluation
--
-- Tables:
--   workflow_rules
--   workflow_execution_logs

CREATE TABLE workflow_rules (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    name                varchar(255)  NOT NULL,
    description         text,
    status              varchar(20)   NOT NULL DEFAULT 'DRAFT',
    trigger_event_type  varchar(100)  NOT NULL,
    conditions          text,
    actions             text          NOT NULL,
    created_by          varchar(100)  NOT NULL,
    updated_by          varchar(100)  NOT NULL,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_workflow_rules PRIMARY KEY (id),
    CONSTRAINT ck_workflow_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

CREATE INDEX ix_workflow_rules_org_status
    ON workflow_rules (organization_id, status);

CREATE INDEX ix_workflow_rules_trigger_status
    ON workflow_rules (trigger_event_type, status);

-- ---------------------------------------------------------------------------

CREATE TABLE workflow_execution_logs (
    id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id     uuid          NOT NULL,
    rule_id             uuid          NOT NULL,
    trigger_event_id    uuid,
    status              varchar(30)   NOT NULL,
    conditions_result   text,
    actions_result      text,
    error_message       text,
    executed_at         timestamptz   NOT NULL DEFAULT now(),
    created_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_workflow_execution_logs PRIMARY KEY (id),
    CONSTRAINT fk_workflow_log_rule FOREIGN KEY (rule_id) REFERENCES workflow_rules (id) ON DELETE CASCADE,
    CONSTRAINT ck_execution_status CHECK (status IN (
        'TRIGGERED', 'CONDITION_MET', 'CONDITION_NOT_MET', 'ACTION_EXECUTED', 'ACTION_FAILED'
    ))
);

CREATE INDEX ix_workflow_log_rule_executed
    ON workflow_execution_logs (rule_id, executed_at DESC);

CREATE INDEX ix_workflow_log_org_executed
    ON workflow_execution_logs (organization_id, executed_at DESC);

-- ---------------------------------------------------------------------------
-- Permissions

INSERT INTO permissions (code, name) VALUES
    ('WORKFLOW_VIEW',   'View workflow rules and their execution logs'),
    ('WORKFLOW_MANAGE', 'Create, update, delete, enable and disable workflow rules');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'WORKFLOW_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR'))
   OR (p.code = 'WORKFLOW_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN'));
