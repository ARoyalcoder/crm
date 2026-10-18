-- Receivables Management: collection tasks and per-org receivables configuration.
--
-- Builds on top of the existing finance module (invoices, payments, ageing) without
-- modifying those tables.
--
-- Tables:
--   collection_tasks      — manual and auto-created follow-up tasks for outstanding invoices
--   receivables_config    — one row per organization: thresholds and automation switches

CREATE TABLE collection_tasks (
    id                      uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid          NOT NULL,
    invoice_id              uuid          NOT NULL,
    customer_id             uuid          NOT NULL,
    assigned_to_user_id     uuid,
    priority                varchar(20)   NOT NULL DEFAULT 'MEDIUM',
    status                  varchar(20)   NOT NULL DEFAULT 'OPEN',
    due_date                date,
    notes                   text,
    completed_at            timestamptz,
    created_by              varchar(100)  NOT NULL,
    updated_by              varchar(100)  NOT NULL,
    created_at              timestamptz   NOT NULL DEFAULT now(),
    updated_at              timestamptz   NOT NULL DEFAULT now(),
    version                 bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_collection_tasks PRIMARY KEY (id),
    CONSTRAINT fk_collection_task_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    CONSTRAINT ck_collection_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ck_collection_task_status   CHECK (status   IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX ix_collection_tasks_org      ON collection_tasks (organization_id);
CREATE INDEX ix_collection_tasks_invoice  ON collection_tasks (invoice_id);
CREATE INDEX ix_collection_tasks_customer ON collection_tasks (customer_id);
CREATE INDEX ix_collection_tasks_status   ON collection_tasks (organization_id, status);
CREATE INDEX ix_collection_tasks_assigned ON collection_tasks (assigned_to_user_id)
    WHERE assigned_to_user_id IS NOT NULL;

CREATE TABLE receivables_config (
    id                      uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id         uuid          NOT NULL,
    overdue_days_1          integer       NOT NULL DEFAULT 3,
    overdue_days_2          integer       NOT NULL DEFAULT 15,
    collection_task_enabled boolean       NOT NULL DEFAULT true,
    escalation_enabled      boolean       NOT NULL DEFAULT true,
    escalation_user_id      uuid,
    created_at              timestamptz   NOT NULL DEFAULT now(),
    updated_at              timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_receivables_config         PRIMARY KEY (id),
    CONSTRAINT uq_receivables_config_org     UNIQUE (organization_id),
    CONSTRAINT ck_receivables_days1_positive CHECK (overdue_days_1 > 0),
    CONSTRAINT ck_receivables_days2_gt_days1 CHECK (overdue_days_2 > overdue_days_1)
);

-- Permissions

INSERT INTO permissions (code, name) VALUES
    ('RECEIVABLES_VIEW',   'View receivables dashboard, outstanding invoices, ageing and collection tasks'),
    ('RECEIVABLES_MANAGE', 'Create and update collection tasks and manage receivables configuration');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (p.code = 'RECEIVABLES_VIEW'   AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'FINANCE'))
   OR (p.code = 'RECEIVABLES_MANAGE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'FINANCE'));
