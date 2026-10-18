-- H2 mirror of V24__proof_of_work.sql for ProofOfWorkServiceTest (plain JDBC, no JPA).
-- Same columns and the entity-reference CHECK. Left out: PostgreSQL-only parts (gen_random_uuid defaults, partial
-- indexes) and the CHECK ... IN (...) list constraints (entity_type, category, attachment_type): H2 2.4 evaluates
-- those through the closed script session and rejects every insert. PostgreSQL enforces them in production.

CREATE TABLE proof_of_work_items (
    id                   uuid          NOT NULL,
    organization_id      uuid          NOT NULL,
    entity_type          varchar(20)   NOT NULL,
    project_id           uuid,
    job_id               uuid,
    title                varchar(200)  NOT NULL,
    category             varchar(30)   NOT NULL DEFAULT 'GENERAL',
    technician_id        uuid,
    technician_name      varchar(200)  NOT NULL,
    technician_notes     clob,
    customer_confirmed   boolean       NOT NULL DEFAULT false,
    customer_name        varchar(200),
    customer_remarks     varchar(1000),
    customer_signature   clob,
    confirmed_at         timestamp with time zone,
    verified             boolean       NOT NULL DEFAULT false,
    verified_by_id       uuid,
    verified_by_name     varchar(200),
    verified_at          timestamp with time zone,
    recorded_at          timestamp with time zone NOT NULL DEFAULT current_timestamp,
    created_at           timestamp with time zone NOT NULL DEFAULT current_timestamp,
    created_by           varchar(100)  NOT NULL,
    updated_at           timestamp with time zone NOT NULL DEFAULT current_timestamp,
    updated_by           varchar(100)  NOT NULL,
    deleted_at           timestamp with time zone,
    deleted_by           varchar(100),
    deletion_reason      varchar(500),
    CONSTRAINT pk_proof_of_work_items PRIMARY KEY (id),
    CONSTRAINT ck_pow_entity_reference CHECK (
        (entity_type = 'PROJECT' AND project_id IS NOT NULL) OR
        (entity_type = 'JOB' AND job_id IS NOT NULL)
    )
);

CREATE TABLE proof_of_work_attachments (
    id                   uuid          NOT NULL,
    proof_item_id        uuid          NOT NULL,
    attachment_type      varchar(20)   NOT NULL,
    file_name            varchar(255)  NOT NULL,
    content_type         varchar(100)  NOT NULL,
    size_bytes           bigint        NOT NULL,
    storage_key          varchar(300)  NOT NULL,
    caption              varchar(300),
    uploaded_by_name     varchar(200)  NOT NULL,
    created_at           timestamp with time zone NOT NULL DEFAULT current_timestamp,
    CONSTRAINT pk_proof_of_work_attachments PRIMARY KEY (id),
    CONSTRAINT fk_pow_attachments_item FOREIGN KEY (proof_item_id) REFERENCES proof_of_work_items (id) ON DELETE CASCADE
);

CREATE TABLE proof_of_work_checklists (
    id                   uuid          NOT NULL,
    proof_item_id        uuid          NOT NULL,
    item_title           varchar(300)  NOT NULL,
    completed            boolean       NOT NULL DEFAULT false,
    completed_at         timestamp with time zone,
    completed_by_name    varchar(200),
    display_order        integer       NOT NULL DEFAULT 0,
    created_at           timestamp with time zone NOT NULL DEFAULT current_timestamp,
    CONSTRAINT pk_proof_of_work_checklists PRIMARY KEY (id),
    CONSTRAINT fk_pow_checklists_item FOREIGN KEY (proof_item_id) REFERENCES proof_of_work_items (id) ON DELETE CASCADE
);
