-- Support Desk: SLA definitions, tickets, comments, attachments, and status history.
--
-- Supports:
--   - SLA definitions per priority with response and resolution time targets
--   - Ticket lifecycle: OPEN → ASSIGNED → IN_PROGRESS → WAITING_CUSTOMER → RESOLVED → CLOSED
--   - Comments (public and internal notes)
--   - File attachments
--   - Full status change history with timestamps
--
-- Tables:
--   sla_definitions
--   tickets ──< ticket_comments
--           ──< ticket_attachments
--           ──< ticket_status_history

-- Sequence for human-readable ticket numbers (e.g. TKT-0001)
CREATE SEQUENCE ticket_number_seq START 1 INCREMENT 1 CACHE 20;

CREATE TABLE sla_definitions (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id          uuid          NOT NULL,
    name                     varchar(100)  NOT NULL,
    response_time_hours      integer       NOT NULL,
    resolution_time_hours    integer       NOT NULL,
    priority                 varchar(20)   NOT NULL,
    active                   boolean       NOT NULL DEFAULT true,
    created_at               timestamptz   NOT NULL DEFAULT now(),
    created_by               varchar(100)  NOT NULL,
    updated_at               timestamptz   NOT NULL DEFAULT now(),
    updated_by               varchar(100)  NOT NULL,
    version                  bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_sla_definitions PRIMARY KEY (id),
    CONSTRAINT ck_sla_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX ix_sla_org ON sla_definitions (organization_id, active);

CREATE TABLE tickets (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    organization_id          uuid          NOT NULL,
    ticket_number            varchar(20)   NOT NULL,
    customer_id              uuid,
    customer_name            varchar(200)  NOT NULL,
    project_id               uuid,
    service_offering_id      uuid,
    subject                  varchar(500)  NOT NULL,
    description              text,
    priority                 varchar(20)   NOT NULL DEFAULT 'MEDIUM',
    status                   varchar(30)   NOT NULL DEFAULT 'OPEN',
    assigned_user_id         uuid,
    assigned_user_name       varchar(200),
    sla_id                   uuid,
    due_at                   timestamptz,
    first_response_at        timestamptz,
    resolved_at              timestamptz,
    created_at               timestamptz   NOT NULL DEFAULT now(),
    created_by               varchar(100)  NOT NULL,
    updated_at               timestamptz   NOT NULL DEFAULT now(),
    updated_by               varchar(100)  NOT NULL,
    version                  bigint        NOT NULL DEFAULT 0,
    CONSTRAINT pk_tickets PRIMARY KEY (id),
    CONSTRAINT uq_ticket_number UNIQUE (ticket_number),
    CONSTRAINT ck_ticket_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ck_ticket_status CHECK (status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
    CONSTRAINT fk_tickets_sla FOREIGN KEY (sla_id) REFERENCES sla_definitions (id)
);

CREATE INDEX ix_tickets_org_status    ON tickets (organization_id, status, created_at DESC);
CREATE INDEX ix_tickets_org_customer  ON tickets (organization_id, customer_id, created_at DESC);
CREATE INDEX ix_tickets_org_assigned  ON tickets (organization_id, assigned_user_id, status);
CREATE INDEX ix_tickets_number        ON tickets (ticket_number);
CREATE INDEX ix_tickets_created_at    ON tickets (organization_id, created_at DESC);

CREATE TABLE ticket_comments (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    ticket_id                uuid          NOT NULL,
    author_id                uuid          NOT NULL,
    author_name              varchar(200)  NOT NULL,
    body                     text          NOT NULL,
    internal                 boolean       NOT NULL DEFAULT false,
    created_at               timestamptz   NOT NULL DEFAULT now(),
    updated_at               timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_ticket_comments PRIMARY KEY (id),
    CONSTRAINT fk_ticket_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);

CREATE INDEX ix_ticket_comments_ticket ON ticket_comments (ticket_id, created_at ASC);

CREATE TABLE ticket_attachments (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    ticket_id                uuid          NOT NULL,
    file_name                varchar(255)  NOT NULL,
    storage_key              varchar(300)  NOT NULL,
    mime_type                varchar(100)  NOT NULL,
    file_size                bigint        NOT NULL,
    uploaded_by_id           uuid          NOT NULL,
    uploaded_by_name         varchar(200)  NOT NULL,
    created_at               timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT pk_ticket_attachments PRIMARY KEY (id),
    CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);

CREATE INDEX ix_ticket_attachments_ticket ON ticket_attachments (ticket_id);

CREATE TABLE ticket_status_history (
    id                       uuid          NOT NULL DEFAULT gen_random_uuid(),
    ticket_id                uuid          NOT NULL,
    from_status              varchar(30),
    to_status                varchar(30)   NOT NULL,
    changed_by_id            uuid          NOT NULL,
    changed_by_name          varchar(200)  NOT NULL,
    changed_at               timestamptz   NOT NULL DEFAULT now(),
    note                     text,
    CONSTRAINT pk_ticket_status_history PRIMARY KEY (id),
    CONSTRAINT fk_ticket_status_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);

CREATE INDEX ix_ticket_status_history_ticket ON ticket_status_history (ticket_id, changed_at ASC);

-- Permissions
INSERT INTO permissions (code, name) VALUES
    ('TICKET_VIEW',    'View support tickets and their details'),
    ('TICKET_CREATE',  'Open new support tickets'),
    ('TICKET_ASSIGN',  'Assign and reassign tickets to agents'),
    ('TICKET_RESOLVE', 'Resolve and close support tickets'),
    ('TICKET_MANAGE',  'Full management of tickets and SLA definitions');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE (p.code = 'TICKET_VIEW'    AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT'))
   OR (p.code = 'TICKET_CREATE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT'))
   OR (p.code = 'TICKET_ASSIGN'  AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT'))
   OR (p.code = 'TICKET_RESOLVE' AND r.code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'PROJECT_MANAGER', 'SUPPORT_AGENT'))
   OR (p.code = 'TICKET_MANAGE'  AND r.code IN ('SUPER_ADMIN', 'ADMIN'));
